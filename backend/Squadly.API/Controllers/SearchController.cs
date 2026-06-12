using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new { projects = Array.Empty<object>(), tasks = Array.Empty<object>(), users = Array.Empty<object>() });

        var userId = GetUserId();
        var query = q.Trim().ToLower();

        var myProjectIds = await _db.ProjectMemberships
            .Where(pm => pm.UserId == userId)
            .Select(pm => pm.ProjectId)
            .ToListAsync();

        var projects = await _db.Projects
            .Where(p => myProjectIds.Contains(p.Id) && !p.IsDeleted)
            .Where(p => p.Title.ToLower().Contains(query)
                || (p.Description != null && p.Description.ToLower().Contains(query)))
            .Take(5)
            .Select(p => new
            {
                id = p.Id,
                title = p.Title,
                description = p.Description ?? "",
                type = "project"
            })
            .ToListAsync();

        var tasks = await _db.Tasks
            .Where(t => myProjectIds.Contains(t.ProjectId))
            .Where(t => _db.Projects.Any(p => p.Id == t.ProjectId && !p.IsDeleted))
            .Where(t => t.Title.ToLower().Contains(query)
                || (t.Description != null && t.Description.ToLower().Contains(query)))
            .Include(t => t.Project)
            .Take(10)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                status = t.Status,
                priority = t.Priority,
                projectTitle = t.Project != null ? t.Project.Title : "",
                type = "task"
            })
            .ToListAsync();

        var memberUserIds = await _db.ProjectMemberships
            .Where(pm => myProjectIds.Contains(pm.ProjectId))
            .Select(pm => pm.UserId)
            .Distinct()
            .ToListAsync();

        var users = await _db.Users
            .Where(u => memberUserIds.Contains(u.Id))
            .Where(u => (u.FirstName + " " + u.LastName).ToLower().Contains(query)
                || u.Email.ToLower().Contains(query))
            .Take(5)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FirstName + " " + u.LastName,
                email = u.Email,
                type = "user"
            })
            .ToListAsync();

        return Ok(new { projects, tasks, users });
    }
}