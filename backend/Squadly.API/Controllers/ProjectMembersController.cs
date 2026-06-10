using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/projects/{projectId}/members")]
[Authorize]
public class ProjectMembersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAuthorizationService _auth;

    public ProjectMembersController(AppDbContext db, IProjectAuthorizationService auth)
    {
        _db = db;
        _auth = auth;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetMembers(Guid projectId)
    {
        var userId = GetUserId();

        if (!await _auth.IsMemberAsync(projectId, userId))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var members = await _db.ProjectMemberships
            .Where(pm => pm.ProjectId == projectId)
            .Include(pm => pm.User)
            .Select(pm => new
            {
                userId = pm.UserId,
                fullName = pm.User != null ? pm.User.FirstName + " " + pm.User.LastName : "Невідомий",
                email = pm.User != null ? pm.User.Email : "",
                role = pm.Role.ToString(),
                joinedAt = pm.JoinedAt
            })
            .ToListAsync();

        return Ok(members);
    }

    [HttpPost]
    public async Task<IActionResult> AddMember(Guid projectId, [FromBody] AddMemberRequest req)
    {
        var userId = GetUserId();

        if (!await _auth.HasRoleAsync(projectId, userId, ProjectRole.Organizer))
            return StatusCode(403, new { message = "Додавати учасників може лише організатор" });

        var userExists = await _db.Users.AnyAsync(u => u.Id == req.UserId);
        if (!userExists)
            return NotFound(new { message = "Користувача не знайдено" });

        var alreadyMember = await _db.ProjectMemberships
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == req.UserId);
        if (alreadyMember)
            return BadRequest(new { message = "Користувач вже є учасником проєкту" });

        if (!Enum.TryParse<ProjectRole>(req.Role, out var role))
            role = ProjectRole.Participant;

        _db.ProjectMemberships.Add(new ProjectMembership
        {
            ProjectId = projectId,
            UserId = req.UserId,
            Role = role
        });

        await _db.SaveChangesAsync();

        return Ok(new { message = "Учасник доданий" });
    }

    [HttpPut("{memberUserId}/role")]
    public async Task<IActionResult> ChangeRole(Guid projectId, Guid memberUserId, [FromBody] ChangeRoleRequest req)
    {
        var userId = GetUserId();

        if (!await _auth.HasRoleAsync(projectId, userId, ProjectRole.Organizer))
            return StatusCode(403, new { message = "Змінювати ролі може лише організатор" });

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == memberUserId);
        if (membership == null)
            return NotFound(new { message = "Учасника не знайдено" });

        if (!Enum.TryParse<ProjectRole>(req.Role, out var newRole))
            return BadRequest(new { message = "Невідома роль" });

        if (memberUserId == userId)
            return BadRequest(new { message = "Не можна змінити свою власну роль" });

        membership.Role = newRole;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Роль змінена" });
    }

    [HttpDelete("{memberUserId}")]
    public async Task<IActionResult> RemoveMember(Guid projectId, Guid memberUserId)
    {
        var userId = GetUserId();

        if (!await _auth.HasRoleAsync(projectId, userId, ProjectRole.Organizer))
            return StatusCode(403, new { message = "Видаляти учасників може лише організатор" });

        if (memberUserId == userId)
            return BadRequest(new { message = "Не можна видалити самого себе" });

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == memberUserId);
        if (membership == null)
            return NotFound(new { message = "Учасника не знайдено" });

        _db.ProjectMemberships.Remove(membership);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Учасник видалений" });
    }

    public class AddMemberRequest
    {
        public Guid UserId { get; set; }
        public string Role { get; set; } = "Participant"; 
    }

    public class ChangeRoleRequest
    {
        public string Role { get; set; } = "Participant";
    }
}