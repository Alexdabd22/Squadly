using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Infrastructure.Persistence;

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

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalProjects = await _db.Projects.CountAsync();
        var totalTeams = await _db.Teams.CountAsync();
        var totalTasks = await _db.Tasks.CountAsync();
        var totalUsers = await _db.Users.CountAsync();
        var totalComments = await _db.Comments.CountAsync();

        var tasksByStatus = await _db.Tasks
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var tasksByPriority = await _db.Tasks
            .GroupBy(t => t.Priority)
            .Select(g => new { Priority = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalProjects,
            totalTeams,
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
        var stats = await _db.Projects
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
        var fromDate = DateTime.UtcNow.Date.AddDays(-13);

        // Завдання, створені за останні 14 днів
        var tasksData = await _db.Tasks
            .Where(t => t.CreatedAt >= fromDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        // Коментарі за останні 14 днів
        var commentsData = await _db.Comments
            .Where(c => c.CreatedAt >= fromDate)
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
        // Топ виконавців за кількістю завершених задач
        var performers = await _db.Tasks
            .Where(t => t.Status == "Done" && t.AssigneeUserId != null)
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
}