using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // Список ID проєктів, де поточний користувач є учасником
    private async Task<List<Guid>> GetMyProjectIdsAsync(Guid userId)
    {
        return await _db.ProjectMemberships
            .Where(pm => pm.UserId == userId)
            .Select(pm => pm.ProjectId)
            .ToListAsync();
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var userId = GetUserId();
        var myProjectIds = await GetMyProjectIdsAsync(userId);

        var totalProjects = myProjectIds.Count;

        var totalTasks = await _db.Tasks
            .CountAsync(t => myProjectIds.Contains(t.ProjectId));

        var totalUsers = await _db.ProjectMemberships
            .Where(pm => myProjectIds.Contains(pm.ProjectId))
            .Select(pm => pm.UserId)
            .Distinct()
            .CountAsync();

        var totalComments = await _db.Comments
            .CountAsync(c => _db.Tasks.Any(t => t.Id == c.TaskItemId && myProjectIds.Contains(t.ProjectId)));

        var tasksByStatus = await _db.Tasks
            .Where(t => myProjectIds.Contains(t.ProjectId))
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var tasksByPriority = await _db.Tasks
            .Where(t => myProjectIds.Contains(t.ProjectId))
            .GroupBy(t => t.Priority)
            .Select(g => new { Priority = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalProjects,
            totalTasks,
            totalUsers,
            totalComments,
            tasksByStatus,
            tasksByPriority
        });
    }

    [HttpGet("projects-stats")]
    public async Task<IActionResult> GetProjectsStats()
    {
        var userId = GetUserId();
        var myProjectIds = await GetMyProjectIdsAsync(userId);

        var stats = await _db.Projects
            .Where(p => myProjectIds.Contains(p.Id) && !p.IsDeleted)
            .Select(p => new
            {
                ProjectId = p.Id,
                Title = p.Title,
                TotalTasks = _db.Tasks.Count(t => t.ProjectId == p.Id),
                CompletedTasks = _db.Tasks.Count(t => t.ProjectId == p.Id && t.Status == "Done"),
                InProgressTasks = _db.Tasks.Count(t => t.ProjectId == p.Id && t.Status == "InProgress"),
                TodoTasks = _db.Tasks.Count(t => t.ProjectId == p.Id && t.Status == "ToDo")
            })
            .OrderByDescending(x => x.TotalTasks)
            .Take(10)
            .ToListAsync();

        return Ok(stats);
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity()
    {
        var userId = GetUserId();
        var myProjectIds = await GetMyProjectIdsAsync(userId);

        var fromDate = DateTime.UtcNow.Date.AddDays(-13);

        var tasksData = await _db.Tasks
            .Where(t => t.CreatedAt >= fromDate && myProjectIds.Contains(t.ProjectId))
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var commentsData = await _db.Comments
            .Where(c => c.CreatedAt >= fromDate &&
                _db.Tasks.Any(t => t.Id == c.TaskItemId && myProjectIds.Contains(t.ProjectId)))
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var result = new List<object>();
        for (int i = 0; i < 14; i++)
        {
            var date = fromDate.AddDays(i);
            var tasksCount = tasksData.FirstOrDefault(t => t.Date == date)?.Count ?? 0;
            var commentsCount = commentsData.FirstOrDefault(c => c.Date == date)?.Count ?? 0;

            result.Add(new
            {
                Date = date.ToString("yyyy-MM-dd"),
                DateLabel = date.ToString("dd.MM"),
                Tasks = tasksCount,
                Comments = commentsCount
            });
        }

        return Ok(result);
    }

    [HttpGet("top-performers")]
    public async Task<IActionResult> GetTopPerformers()
    {
        var userId = GetUserId();
        var myProjectIds = await GetMyProjectIdsAsync(userId);

        var performers = await _db.Tasks
            .Where(t => t.Status == "Done"
                && t.AssigneeUserId != null
                && myProjectIds.Contains(t.ProjectId))
            .GroupBy(t => t.AssigneeUserId)
            .Select(g => new
            {
                UserId = g.Key,
                CompletedTasks = g.Count()
            })
            .OrderByDescending(x => x.CompletedTasks)
            .Take(5)
            .ToListAsync();

        var userIds = performers.Select(p => p.UserId).ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var result = performers.Select(p => new
        {
            UserId = p.UserId,
            FullName = p.UserId.HasValue && users.ContainsKey(p.UserId.Value)
                ? $"{users[p.UserId.Value].FirstName} {users[p.UserId.Value].LastName}"
                : "Невідомий",
            CompletedTasks = p.CompletedTasks
        }).ToList();

        return Ok(result);
    }
    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectAnalytics(Guid projectId)
    {
        var userId = GetUserId();

        var isMember = await _db.ProjectMemberships.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
        if (!isMember)
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);
        if (project == null)
            return NotFound(new { message = "Проєкт не знайдено" });

        var totalTasks = await _db.Tasks.CountAsync(t => t.ProjectId == projectId);
        var todo = await _db.Tasks.CountAsync(t => t.ProjectId == projectId && t.Status == "ToDo");
        var inProgress = await _db.Tasks.CountAsync(t => t.ProjectId == projectId && t.Status == "InProgress");
        var done = await _db.Tasks.CountAsync(t => t.ProjectId == projectId && t.Status == "Done");

        var overdueTasks = await _db.Tasks
            .CountAsync(t => t.ProjectId == projectId
                && t.DueDate.HasValue
                && t.DueDate < DateTime.UtcNow
                && t.Status != "Done");

        var members = await _db.ProjectMemberships.CountAsync(pm => pm.ProjectId == projectId);

        var comments = await _db.Comments
            .CountAsync(c => _db.Tasks.Any(t => t.Id == c.TaskItemId && t.ProjectId == projectId));

        var tasksByPriority = await _db.Tasks
            .Where(t => t.ProjectId == projectId)
            .GroupBy(t => t.Priority)
            .Select(g => new { Priority = g.Key, Count = g.Count() })
            .ToListAsync();

        var topAssignees = await _db.Tasks
            .Where(t => t.ProjectId == projectId
                && t.AssigneeUserId != null
                && t.Status == "Done")
            .GroupBy(t => t.AssigneeUserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var assigneeIds = topAssignees.Select(x => x.UserId).ToList();
        var assigneeUsers = await _db.Users
            .Where(u => assigneeIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var topAssigneesDto = topAssignees.Select(x => new
        {
            UserId = x.UserId,
            FullName = x.UserId.HasValue && assigneeUsers.ContainsKey(x.UserId.Value)
                ? $"{assigneeUsers[x.UserId.Value].FirstName} {assigneeUsers[x.UserId.Value].LastName}"
                : "Невідомий",
            CompletedTasks = x.Count
        }).ToList();

        var completionRate = totalTasks > 0 ? Math.Round((double)done / totalTasks * 100, 1) : 0;

        return Ok(new
        {
            totalTasks,
            todo,
            inProgress,
            done,
            overdueTasks,
            members,
            comments,
            completionRate,
            tasksByPriority,
            topAssignees = topAssigneesDto
        });
    }
}