using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public TasksController(
        AppDbContext db,
        INotificationService notifications,
        IRatingService ratings,
        IProjectAuthorizationService auth)
    {
        _db = db;
        _notifications = notifications;
        _ratings = ratings;
        _auth = auth;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

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
            .Include(t => t.Comments!)
                .ThenInclude(c => c.Author)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        foreach (var task in tasks)
        {
            if (task.Comments != null)
            {
                task.Comments = task.Comments.OrderBy(c => c.CreatedAt).ToList();
            }
        }

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва задачі обов'язкова" });

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == dto.ProjectId && !p.IsDeleted);
        if (!projectExists)
            return BadRequest(new { message = "Проєкт не знайдено" });

        try
        {
            await _auth.EnsureMemberAsync(dto.ProjectId, userId);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }

        if (dto.AssigneeUserId.HasValue)
        {
            var isAssigneeMember = await _db.ProjectMemberships
                .AnyAsync(pm => pm.ProjectId == dto.ProjectId && pm.UserId == dto.AssigneeUserId.Value);
            if (!isAssigneeMember)
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

    [HttpPost("{taskId}/comments")]
    public async Task<IActionResult> AddComment(Guid taskId, [FromBody] AddCommentDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Коментар не може бути порожнім" });

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        // Перевірка членства у проєкті
        try
        {
            await _auth.EnsureMemberAsync(task.ProjectId, userId);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }

        //  Автор завжди — поточний користувач
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

        if (comment == null)
            return NotFound(new { message = "Коментар не знайдено" });

        if (comment.AuthorUserId != userId)
            return StatusCode(403, new { message = "Ви можете видаляти лише свої коментарі" });

        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Коментар видалено" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        try
        {
            await _auth.EnsureMemberAsync(task.ProjectId, userId);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва задачі обов'язкова" });

        if (dto.AssigneeUserId.HasValue)
        {
            var isAssigneeMember = await _db.ProjectMemberships
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == dto.AssigneeUserId.Value);
            if (!isAssigneeMember)
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
                "Done" => "Виконано",
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

        if (previousStatus != "Done" && dto.Status == "Done" && task.AssigneeUserId.HasValue)
        {
            await _ratings.AwardForTaskCompletionAsync(
                userId: task.AssigneeUserId.Value,
                priority: task.Priority,
                taskId: task.Id
            );
        }

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        // Видаляти можуть тільки Organizer проєкту
        try
        {
            await _auth.EnsureRoleAsync(task.ProjectId, userId, ProjectRole.Organizer);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { message = "Видаляти задачі може лише організатор проєкту" });
        }

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Завдання видалено" });
    }
}