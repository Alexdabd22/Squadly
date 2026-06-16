using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Users;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Select(u => new
            {
                u.Id,
                u.Email,
                FullName = u.FirstName + " " + u.LastName,
                u.FirstName,
                u.LastName
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString(),
            user.CreatedAt
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateProfileDto dto)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

       return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString()
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        var totalPoints = await _db.Ratings
            .Where(r => r.UserId == id)
            .SumAsync(r => (int?)r.Points) ?? 0;

        var tasksCompleted = await _db.Tasks
            .CountAsync(t => t.AssigneeUserId == id && t.Status == "Done");

        var tasksInProgress = await _db.Tasks
            .CountAsync(t => t.AssigneeUserId == id && t.Status == "InProgress");

        var commentsCount = await _db.Comments.CountAsync(c => c.AuthorUserId == id);

        var allPoints = await _db.Ratings
            .GroupBy(r => r.UserId)
            .Select(g => new { UserId = g.Key, Points = g.Sum(r => r.Points) })
            .OrderByDescending(x => x.Points)
            .ToListAsync();
        var rank = allPoints.FindIndex(x => x.UserId == id) + 1;

        var projectsCount = await _db.ProjectMemberships
            .CountAsync(pm => pm.UserId == id
                && _db.Projects.Any(p => p.Id == pm.ProjectId && !p.IsDeleted));

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString(),
            user.CreatedAt,
            Stats = new
            {
                TotalPoints = totalPoints,
                Rank = rank > 0 ? rank : 0,
                TasksCompleted = tasksCompleted,
                TasksInProgress = tasksInProgress,
                CommentsCount = commentsCount,
                ProjectsCount = projectsCount,
            }
        });
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(sub!);
    }
}