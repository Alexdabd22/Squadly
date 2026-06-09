using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Teams;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAuthorizationService _auth;

    public TeamsController(AppDbContext db, IProjectAuthorizationService auth)
    {
        _db = db;
        _auth = auth;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();

        var teams = await _db.Teams
            .Where(t => _db.ProjectMemberships.Any(pm => pm.ProjectId == t.ProjectId && pm.UserId == userId))
            .Include(t => t.Project)
            .Include(t => t.TeamLead)
            .Include(t => t.Memberships)
            .ToListAsync();

        return Ok(teams);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Назва команди обов'язкова" });

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == dto.ProjectId && !p.IsDeleted);
        if (!projectExists)
            return BadRequest(new { message = "Проєкт не знайдено" });

        try
        {
            await _auth.EnsureRoleAsync(dto.ProjectId, userId, ProjectRole.Organizer);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { message = "Створювати команди може лише організатор проєкту" });
        }

        if (dto.TeamLeadUserId.HasValue)
        {
            var isTeamLeadMember = await _db.ProjectMemberships
                .AnyAsync(pm => pm.ProjectId == dto.ProjectId && pm.UserId == dto.TeamLeadUserId.Value);
            if (!isTeamLeadMember)
                return BadRequest(new { message = "Лідер команди має бути учасником проєкту" });
        }

        var team = new Team
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            ProjectId = dto.ProjectId,
            TeamLeadUserId = dto.TeamLeadUserId
        };

        _db.Teams.Add(team);
        await _db.SaveChangesAsync();

        _db.TeamMemberships.Add(new TeamMembership
        {
            TeamId = team.Id,
            UserId = userId,
            Role = "Member"
        });
        await _db.SaveChangesAsync();

        return Ok(team);
    }

    [HttpPost("{teamId}/members")]
    public async Task<IActionResult> AddMember(Guid teamId, [FromBody] AddTeamMemberDto dto)
    {
        var userId = GetUserId();

        var team = await _db.Teams.FirstOrDefaultAsync(t => t.Id == teamId);
        if (team == null)
            return NotFound(new { message = "Команду не знайдено" });

        try
        {
            await _auth.EnsureRoleAsync(team.ProjectId, userId, ProjectRole.Organizer);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { message = "Додавати учасників може лише організатор проєкту" });
        }

        var isMemberOfProject = await _db.ProjectMemberships
            .AnyAsync(pm => pm.ProjectId == team.ProjectId && pm.UserId == dto.UserId);
        if (!isMemberOfProject)
            return BadRequest(new { message = "Користувач має бути учасником проєкту" });

        var alreadyExists = await _db.TeamMemberships
            .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == dto.UserId);
        if (alreadyExists)
            return BadRequest(new { message = "Користувач уже в команді" });

        var membership = new TeamMembership
        {
            TeamId = teamId,
            UserId = dto.UserId,
            Role = dto.Role
        };

        _db.TeamMemberships.Add(membership);
        await _db.SaveChangesAsync();

        return Ok(membership);
    }
}