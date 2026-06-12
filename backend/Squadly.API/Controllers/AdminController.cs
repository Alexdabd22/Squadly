using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Admin;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.FirstName)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                FullName = u.FirstName + " " + u.LastName,
                GlobalRole = u.GlobalRole.ToString(),
                u.CreatedAt,
                u.LastLoginAt,
                ProjectsCreated = _db.Projects.Count(p => p.CreatedByUserId == u.Id && !p.IsDeleted)
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT /api/admin/users/{id}/global-role
    [HttpPut("users/{id:guid}/global-role")]
    public async Task<IActionResult> UpdateGlobalRole(Guid id, [FromBody] UpdateGlobalRoleDto dto)
    {
        var currentUserId = GetUserId();

        if (id == currentUserId)
            return BadRequest(new { message = "Ви не можете змінити власну роль" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        if (!Enum.TryParse<GlobalRole>(dto.GlobalRole, out var newRole))
            return BadRequest(new { message = "Невідома роль" });

        user.GlobalRole = newRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString()
        });
    }

    // GET /api/admin/projects
    [HttpGet("projects")]
    public async Task<IActionResult> GetAllProjects()
    {
        var projects = await _db.Projects
            .Where(p => !p.IsDeleted)
            .Include(p => p.CreatedByUser)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Description,
                p.CreatedAt,
                Owner = p.CreatedByUser == null ? null : new
                {
                    p.CreatedByUser.Id,
                    p.CreatedByUser.Email,
                    FullName = p.CreatedByUser.FirstName + " " + p.CreatedByUser.LastName
                },
                MembersCount = _db.ProjectMemberships.Count(pm => pm.ProjectId == p.Id),
                TasksCount = _db.Tasks.Count(t => t.ProjectId == p.Id),
                TasksDone = _db.Tasks.Count(t => t.ProjectId == p.Id && t.Status == "Done")
            })
            .ToListAsync();

        return Ok(projects);
    }

    // GET /api/admin/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalAdmins = await _db.Users.CountAsync(u => u.GlobalRole == GlobalRole.Admin);
        var totalOrganizers = await _db.Users.CountAsync(u => u.GlobalRole == GlobalRole.Organizer);
        var totalProjects = await _db.Projects.CountAsync(p => !p.IsDeleted);
        var totalTasks = await _db.Tasks.CountAsync();

        return Ok(new
        {
            totalUsers,
            totalAdmins,
            totalOrganizers,
            totalProjects,
            totalTasks
        });
    }
}