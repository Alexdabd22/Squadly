using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Ratings;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RatingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RatingsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard()
    {
        var aggregated = await _db.Ratings
            .GroupBy(r => r.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                TotalPoints = g.Sum(r => r.Points),
                TasksCompleted = g.Count(r => r.Reason.StartsWith("TaskCompleted_"))
            })
            .OrderByDescending(x => x.TotalPoints)
            .Take(100)
            .ToListAsync();

        var userIds = aggregated.Select(a => a.UserId).ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var leaderboard = aggregated
            .Select((a, index) => new LeaderboardEntryDto
            {
                UserId = a.UserId,
                FullName = users.ContainsKey(a.UserId)
                    ? $"{users[a.UserId].FirstName} {users[a.UserId].LastName}"
                    : "Невідомий",
                Email = users.ContainsKey(a.UserId) ? users[a.UserId].Email : "",
                TotalPoints = a.TotalPoints,
                TasksCompleted = a.TasksCompleted,
                Rank = index + 1
            })
            .ToList();

        return Ok(leaderboard);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyStats()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var ratings = await _db.Ratings
            .Where(r => r.UserId == userId.Value)
            .ToListAsync();

        var totalPoints = ratings.Sum(r => r.Points);

        // ранг
        var rank = await _db.Ratings
            .GroupBy(r => r.UserId)
            .Where(g => g.Sum(r => r.Points) > totalPoints)
            .CountAsync() + 1;

        return Ok(new UserStatsDto
        {
            UserId = userId.Value,
            TotalPoints = totalPoints,
            Rank = totalPoints > 0 ? rank : 0,
            TasksCompleted = ratings.Count(r => r.Reason.StartsWith("TaskCompleted_")),
            TasksCompletedHigh = ratings.Count(r => r.Reason == "TaskCompleted_High"),
            TasksCompletedMedium = ratings.Count(r => r.Reason == "TaskCompleted_Medium"),
            TasksCompletedLow = ratings.Count(r => r.Reason == "TaskCompleted_Low"),
            CommentsCount = ratings.Count(r => r.Reason == "CommentAdded")
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserStats(Guid userId)
    {
        var ratings = await _db.Ratings
            .Where(r => r.UserId == userId)
            .ToListAsync();

        var totalPoints = ratings.Sum(r => r.Points);

        var rank = await _db.Ratings
            .GroupBy(r => r.UserId)
            .Where(g => g.Sum(r => r.Points) > totalPoints)
            .CountAsync() + 1;

        return Ok(new UserStatsDto
        {
            UserId = userId,
            TotalPoints = totalPoints,
            Rank = totalPoints > 0 ? rank : 0,
            TasksCompleted = ratings.Count(r => r.Reason.StartsWith("TaskCompleted_")),
            TasksCompletedHigh = ratings.Count(r => r.Reason == "TaskCompleted_High"),
            TasksCompletedMedium = ratings.Count(r => r.Reason == "TaskCompleted_Medium"),
            TasksCompletedLow = ratings.Count(r => r.Reason == "TaskCompleted_Low"),
            CommentsCount = ratings.Count(r => r.Reason == "CommentAdded")
        });
    }
}