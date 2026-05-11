using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Tasks;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using Squadly.Infrastructure.Services;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public TasksController(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.Team)
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
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == dto.ProjectId);
        if (!projectExists)
            return BadRequest(new { message = "Проєкт не знайдено" });

        if (dto.TeamId.HasValue)
        {
            var teamExists = await _db.Teams.AnyAsync(t => t.Id == dto.TeamId.Value);
            if (!teamExists)
                return BadRequest(new { message = "Команду не знайдено" });
        }

        if (dto.AssigneeUserId.HasValue)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == dto.AssigneeUserId.Value);
            if (!userExists)
                return BadRequest(new { message = "Виконавця не знайдено" });
        }

        var task = new TaskItem
        {
            Title = dto.Title,
            Description = dto.Description,
            Status = dto.Status,
            Priority = dto.Priority,
            ProjectId = dto.ProjectId,
            TeamId = dto.TeamId,
            AssigneeUserId = dto.AssigneeUserId,
            DueDate = dto.DueDate
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        // Сповіщення виконавцю
        if (task.AssigneeUserId.HasValue)
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
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.AuthorUserId);
        if (!userExists)
            return NotFound(new { message = "Користувача не знайдено" });

        var comment = new Comment
        {
            TaskItemId = taskId,
            AuthorUserId = dto.AuthorUserId,
            Content = dto.Content
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();
        await _db.Entry(comment).Reference(c => c.Author).LoadAsync();

        if (task.AssigneeUserId.HasValue && task.AssigneeUserId.Value != dto.AuthorUserId)
        {
            var author = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.AuthorUserId);
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

        return Ok(comment);
    }

    [HttpDelete("{taskId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid taskId, Guid commentId)
    {
        var comment = await _db.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TaskItemId == taskId);

        if (comment == null)
            return NotFound(new { message = "Коментар не знайдено" });

        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Коментар видалено" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        if (dto.TeamId.HasValue)
        {
            var teamExists = await _db.Teams.AnyAsync(t => t.Id == dto.TeamId.Value);
            if (!teamExists)
                return BadRequest(new { message = "Команду не знайдено" });
        }

        if (dto.AssigneeUserId.HasValue)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == dto.AssigneeUserId.Value);
            if (!userExists)
                return BadRequest(new { message = "Виконавця не знайдено" });
        }

        var previousAssigneeId = task.AssigneeUserId;
        var previousStatus = task.Status;

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Status = dto.Status;
        task.Priority = dto.Priority;
        task.TeamId = dto.TeamId;
        task.AssigneeUserId = dto.AssigneeUserId;
        task.DueDate = dto.DueDate;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (dto.AssigneeUserId.HasValue && dto.AssigneeUserId != previousAssigneeId)
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

        if (previousStatus != dto.Status && task.AssigneeUserId.HasValue)
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

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
            return NotFound(new { message = "Завдання не знайдено" });

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Завдання видалено" });
    }
}