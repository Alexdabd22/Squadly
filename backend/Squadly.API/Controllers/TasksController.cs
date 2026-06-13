using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Squadly.API.Hubs;
using Squadly.Application.DTOs.Tasks;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using Squadly.Infrastructure.Services;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IRatingService _ratings;
    private readonly IProjectAuthorizationService _auth;
    private readonly IHubContext<ChatHub> _hub;

    public TasksController(
        AppDbContext db,
        INotificationService notifications,
        IRatingService ratings,
        IProjectAuthorizationService auth,
        IHubContext<ChatHub> hub)
    {
        _db = db;
        _notifications = notifications;
        _ratings = ratings;
        _auth = auth;
        _hub = hub;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // ───────────────────── GET ALL ─────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? projectId = null)
    {
        var userId = GetUserId();

        if (projectId.HasValue)
        {
            if (!await _auth.IsMemberAsync(projectId.Value, userId))
                return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });
        }

        var query = _db.Tasks
            .Where(t => _db.ProjectMemberships.Any(pm => pm.ProjectId == t.ProjectId && pm.UserId == userId))
            .Where(t => _db.Projects.Any(p => p.Id == t.ProjectId && !p.IsDeleted));

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId.Value);

        var tasks = await query
            .Include(t => t.Assignee)
            .Include(t => t.ReviewClaimedByUser)
            .Include(t => t.Comments!)
                .ThenInclude(c => c.Author)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        foreach (var task in tasks)
        {
            if (task.Comments != null)
                task.Comments = task.Comments.OrderBy(c => c.CreatedAt).ToList();
        }

        return Ok(tasks);
    }

    // ───────────────────── CREATE ─────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва задачі обов'язкова" });

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == dto.ProjectId && !p.IsDeleted);
        if (!projectExists)
            return BadRequest(new { message = "Проєкт не знайдено" });

        try { await _auth.EnsureMemberAsync(dto.ProjectId, userId); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }

        if (dto.AssigneeUserId.HasValue)
        {
            var isMember = await _db.ProjectMemberships
                .AnyAsync(pm => pm.ProjectId == dto.ProjectId && pm.UserId == dto.AssigneeUserId.Value);
            if (!isMember)
                return BadRequest(new { message = "Виконавець не є учасником проєкту" });
        }

        var task = new TaskItem
        {
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            Status = dto.Status,
            Priority = dto.Priority,
            ProjectId = dto.ProjectId,
            AssigneeUserId = dto.AssigneeUserId,
            DueDate = dto.DueDate.HasValue
                ? DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Utc)
                : null
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        if (task.AssigneeUserId.HasValue && task.AssigneeUserId != userId)
        {
            await _notifications.CreateAsync(
                userId: task.AssigneeUserId.Value,
                type: "TaskAssigned",
                title: "Вам призначено задачу",
                message: $"Вас призначено виконавцем задачі «{task.Title}»",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        return Ok(task);
    }

    // ───────────────────── UPDATE ─────────────────────

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        try { await _auth.EnsureMemberAsync(task.ProjectId, userId); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва задачі обов'язкова" });

        if (dto.AssigneeUserId.HasValue)
        {
            var isMember = await _db.ProjectMemberships
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == dto.AssigneeUserId.Value);
            if (!isMember)
                return BadRequest(new { message = "Виконавець не є учасником проєкту" });
        }

        var previousAssigneeId = task.AssigneeUserId;
        var previousStatus = task.Status;

        task.Title = dto.Title.Trim();
        task.Description = dto.Description?.Trim();
        task.Status = dto.Status;
        task.Priority = dto.Priority;
        task.AssigneeUserId = dto.AssigneeUserId;
        task.DueDate = dto.DueDate.HasValue
            ? DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Utc)
            : null;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (dto.AssigneeUserId.HasValue && dto.AssigneeUserId != previousAssigneeId && dto.AssigneeUserId != userId)
        {
            await _notifications.CreateAsync(
                userId: dto.AssigneeUserId.Value,
                type: "TaskAssigned",
                title: "Вам призначено задачу",
                message: $"Вас призначено виконавцем задачі «{task.Title}»",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        if (previousStatus != dto.Status && task.AssigneeUserId.HasValue && task.AssigneeUserId != userId)
        {
            var statusLabel = dto.Status switch
            {
                "ToDo" => "До виконання",
                "InProgress" => "В роботі",
                "InReview" => "На перевірці",
                "Done" => "Виконано",
                "NeedsRevision" => "Потребує доопрацювання",
                _ => dto.Status
            };

            await _notifications.CreateAsync(
                userId: task.AssigneeUserId.Value,
                type: "TaskStatusChanged",
                title: "Статус задачі змінено",
                message: $"Статус задачі «{task.Title}» змінено на «{statusLabel}»",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        if (previousStatus != dto.Status)
        {
            await _hub.Clients.Group($"project-{task.ProjectId}")
                .SendAsync("TaskStatusChanged", new { taskId = task.Id, status = task.Status });
        }

        return Ok(task);
    }

    // ───────────────────── SUBMIT (Participant здає задачу) ─────────────────────

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitTaskDto dto)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        try { await _auth.EnsureMemberAsync(task.ProjectId, userId); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }


        if (task.AssigneeUserId != userId)
            return StatusCode(403, new { message = "Здавати задачу може тільки призначений виконавець" });

        if (task.Status != "InProgress" && task.Status != "NeedsRevision")
            return BadRequest(new { message = "Здати можна лише задачу зі статусом «В роботі» або «Потребує доопрацювання»" });

        if (!dto.SelfChecked)
            return BadRequest(new { message = "Підтвердіть, що ви перевірили роботу (чекбокс самоперевірки)" });

        var submissionNumber = await _db.TaskSubmissions
            .CountAsync(s => s.TaskItemId == task.Id) + 1;

        var submission = new TaskSubmission
        {
            TaskItemId = task.Id,
            SubmittedByUserId = userId,
            WhatWasDone = dto.WhatWasDone.Trim(),
            Links = NormalizeLinks(dto.Links),
            HoursSpent = dto.HoursSpent,
            SubmissionNumber = submissionNumber
        };

        _db.TaskSubmissions.Add(submission);
        task.Status = "InReview";
        task.ReviewClaimedByUserId = null;
        task.ReviewClaimedAt = null;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var reviewerIds = await _db.ProjectMemberships
            .Where(pm => pm.ProjectId == task.ProjectId
                && (pm.Role == ProjectRole.Mentor || pm.Role == ProjectRole.Organizer)
                && pm.UserId != userId)
            .Select(pm => pm.UserId)
            .ToListAsync();

        var submitterName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstOrDefaultAsync() ?? "Користувач";

        foreach (var reviewerId in reviewerIds)
        {
            await _notifications.CreateAsync(
                userId: reviewerId,
                type: "TaskSubmitted",
                title: "Задачу здано на перевірку",
                message: $"{submitterName} здав(ла) задачу «{task.Title}» на перевірку (спроба #{submissionNumber})",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        await _hub.Clients.Group($"project-{task.ProjectId}")
            .SendAsync("TaskStatusChanged", new { taskId = task.Id, status = "InReview" });

        return Ok(new { message = "Задачу здано на перевірку", submissionNumber });
    }

    // ───────────────────── CLAIM REVIEW (Mentor/Organizer бере на перевірку) ─────────────────────

    [HttpPost("{id}/claim-review")]
    public async Task<IActionResult> ClaimReview(Guid id)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });
        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);
        if (membership == null)
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });
        if (membership.Role != ProjectRole.Mentor && membership.Role != ProjectRole.Organizer)
            return StatusCode(403, new { message = "Перевіряти можуть лише ментор або організатор" });

        if (task.Status != "InReview")
            return BadRequest(new { message = "Задача не на перевірці" });

        if (task.ReviewClaimedByUserId.HasValue)
        {
            var claimerName = await _db.Users
                .Where(u => u.Id == task.ReviewClaimedByUserId.Value)
                .Select(u => u.FirstName + " " + u.LastName)
                .FirstOrDefaultAsync() ?? "Хтось";
            return BadRequest(new { message = $"Задачу вже перевіряє {claimerName}" });
        }

        task.ReviewClaimedByUserId = userId;
        task.ReviewClaimedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var reviewerName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstOrDefaultAsync() ?? "Ментор";

        await _hub.Clients.Group($"project-{task.ProjectId}")
            .SendAsync("TaskReviewClaimed", new
            {
                taskId = task.Id,
                claimedByUserId = userId,
                claimedByName = reviewerName
            });

        return Ok(new { message = $"Ви взяли задачу на перевірку" });
    }

    // ───────────────────── RELEASE REVIEW (відпустити claim) ─────────────────────

    [HttpPost("{id}/release-review")]
    public async Task<IActionResult> ReleaseReview(Guid id)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        if (task.ReviewClaimedByUserId != userId)
            return BadRequest(new { message = "Ви не тримаєте цю задачу на перевірці" });

        task.ReviewClaimedByUserId = null;
        task.ReviewClaimedAt = null;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"project-{task.ProjectId}")
            .SendAsync("TaskReviewReleased", new { taskId = task.Id });

        return Ok(new { message = "Перевірку звільнено" });
    }

    // ───────────────────── ACCEPT (прийняти задачу) ─────────────────────

    [HttpPost("{id}/accept")]
    public async Task<IActionResult> Accept(Guid id, [FromBody] ReviewTaskDto dto)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);
        if (membership == null || (membership.Role != ProjectRole.Mentor && membership.Role != ProjectRole.Organizer))
            return StatusCode(403, new { message = "Приймати можуть лише ментор або організатор" });

        if (task.Status != "InReview")
            return BadRequest(new { message = "Задача не на перевірці" });

        if (task.ReviewClaimedByUserId.HasValue
            && task.ReviewClaimedByUserId != userId
            && membership.Role != ProjectRole.Organizer)
        {
            return BadRequest(new { message = "Задачу перевіряє інший ментор" });
        }

        task.Status = "Done";
        task.ReviewedByUserId = userId;
        task.ReviewComment = dto.Comment?.Trim();
        task.ReviewClaimedByUserId = null;
        task.ReviewClaimedAt = null;
        task.UpdatedAt = DateTime.UtcNow;

        if (!task.PointsAwarded && task.AssigneeUserId.HasValue)
        {
            await _ratings.AwardForTaskCompletionAsync(
                userId: task.AssigneeUserId.Value,
                priority: task.Priority,
                taskId: task.Id
            );
            task.PointsAwarded = true;
        }

        await _db.SaveChangesAsync();

        if (task.AssigneeUserId.HasValue && task.AssigneeUserId != userId)
        {
            var reviewerName = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.FirstName + " " + u.LastName)
                .FirstOrDefaultAsync() ?? "Ментор";

            await _notifications.CreateAsync(
                userId: task.AssigneeUserId.Value,
                type: "TaskAccepted",
                title: "Задачу прийнято!",
                message: $"{reviewerName} прийняв(ла) задачу «{task.Title}»" +
                    (string.IsNullOrEmpty(dto.Comment) ? "" : $". Коментар: {dto.Comment}"),
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        await _hub.Clients.Group($"project-{task.ProjectId}")
            .SendAsync("TaskStatusChanged", new { taskId = task.Id, status = "Done" });

        return Ok(new { message = "Задачу прийнято" });
    }

    // ───────────────────── RETURN (повернути на доопрацювання) ─────────────────────

    [HttpPost("{id}/return")]
    public async Task<IActionResult> Return(Guid id, [FromBody] ReviewTaskDto dto)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);
        if (membership == null || (membership.Role != ProjectRole.Mentor && membership.Role != ProjectRole.Organizer))
            return StatusCode(403, new { message = "Повертати можуть лише ментор або організатор" });

        if (task.Status != "InReview")
            return BadRequest(new { message = "Задача не на перевірці" });

        if (string.IsNullOrWhiteSpace(dto.Comment))
            return BadRequest(new { message = "Вкажіть причину повернення" });

        // Claim check
        if (task.ReviewClaimedByUserId.HasValue
            && task.ReviewClaimedByUserId != userId
            && membership.Role != ProjectRole.Organizer)
        {
            return BadRequest(new { message = "Задачу перевіряє інший ментор" });
        }

        task.Status = "NeedsRevision";
        task.ReviewedByUserId = userId;
        task.ReviewComment = dto.Comment.Trim();
        task.ReviewClaimedByUserId = null;
        task.ReviewClaimedAt = null;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (task.AssigneeUserId.HasValue && task.AssigneeUserId != userId)
        {
            var reviewerName = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.FirstName + " " + u.LastName)
                .FirstOrDefaultAsync() ?? "Ментор";

            await _notifications.CreateAsync(
                userId: task.AssigneeUserId.Value,
                type: "TaskReturned",
                title: "Задачу повернуто",
                message: $"{reviewerName} повернув(ла) задачу «{task.Title}»: {dto.Comment}",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        await _hub.Clients.Group($"project-{task.ProjectId}")
            .SendAsync("TaskStatusChanged", new { taskId = task.Id, status = "NeedsRevision" });

        return Ok(new { message = "Задачу повернуто на доопрацювання" });
    }

    // ───────────────────── GET SUBMISSIONS ─────────────────────

    [HttpGet("{id}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        try { await _auth.EnsureMemberAsync(task.ProjectId, userId); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }

        var submissions = await _db.TaskSubmissions
            .Where(s => s.TaskItemId == id)
            .Include(s => s.SubmittedByUser)
            .OrderByDescending(s => s.SubmissionNumber)
            .Select(s => new
            {
                s.Id,
                s.WhatWasDone,
                s.Links,
                s.HoursSpent,
                s.SubmissionNumber,
                s.CreatedAt,
                SubmittedBy = s.SubmittedByUser == null ? "Невідомий"
                    : s.SubmittedByUser.FirstName + " " + s.SubmittedByUser.LastName
            })
            .ToListAsync();

        return Ok(submissions);
    }

    // ───────────────────── COMMENTS ─────────────────────

    [HttpPost("{taskId}/comments")]
    public async Task<IActionResult> AddComment(Guid taskId, [FromBody] AddCommentDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Коментар не може бути порожнім" });

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        try { await _auth.EnsureMemberAsync(task.ProjectId, userId); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }

        var comment = new Comment
        {
            TaskItemId = taskId,
            AuthorUserId = userId,
            Content = dto.Content.Trim()
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();
        await _db.Entry(comment).Reference(c => c.Author).LoadAsync();

        if (task.AssigneeUserId.HasValue && task.AssigneeUserId.Value != userId)
        {
            var author = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var authorName = author != null ? $"{author.FirstName} {author.LastName}" : "Користувач";

            await _notifications.CreateAsync(
                userId: task.AssigneeUserId.Value,
                type: "TaskCommented",
                title: "Новий коментар",
                message: $"{authorName} додав(ла) коментар до задачі «{task.Title}»",
                relatedId: task.Id,
                relatedType: "Task"
            );
        }

        await _ratings.AwardForCommentAsync(userId, comment.Id);
        return Ok(comment);
    }

    [HttpDelete("{taskId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid taskId, Guid commentId)
    {
        var userId = GetUserId();

        var comment = await _db.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TaskItemId == taskId);
        if (comment == null) return NotFound(new { message = "Коментар не знайдено" });

        if (comment.AuthorUserId != userId)
            return StatusCode(403, new { message = "Ви можете видаляти лише свої коментарі" });

        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Коментар видалено" });
    }

    // ───────────────────── DELETE TASK ─────────────────────

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Завдання не знайдено" });

        try { await _auth.EnsureRoleAsync(task.ProjectId, userId, ProjectRole.Organizer); }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { message = "Видаляти задачі може лише організатор проєкту" });
        }

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Завдання видалено" });
    }

    // ───────────────────── HELPERS ─────────────────────

    private static List<string> NormalizeLinks(List<string>? links)
    {
        if (links == null) return new List<string>();
        return links
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Select(l => l.Trim())
            .Where(l => l.Length <= 500)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .ToList();
    }
}