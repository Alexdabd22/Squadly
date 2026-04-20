using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Tasks;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.Team)
            .Include(t => t.Assignee)
            .Include(t => t.Comments)
            .ToListAsync();

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

        return Ok(task);
    }

    [HttpPost("{taskId}/comments")]
    public async Task<IActionResult> AddComment(Guid taskId, [FromBody] AddCommentDto dto)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
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

        return Ok(comment);
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

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Status = dto.Status;
        task.Priority = dto.Priority;
        task.TeamId = dto.TeamId;
        task.AssigneeUserId = dto.AssigneeUserId;
        task.DueDate = dto.DueDate;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

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