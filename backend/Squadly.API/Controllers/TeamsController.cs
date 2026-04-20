using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Teams;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TeamsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var teams = await _db.Teams
            .Include(t => t.Project)
            .Include(t => t.TeamLead)
            .Include(t => t.Memberships)
            .ToListAsync();

        return Ok(teams);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamDto dto)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == dto.ProjectId);
        if (!projectExists)
            return BadRequest(new { message = "Проєкт не знайдено" });

        var team = new Team
        {
            Name = dto.Name,
            Description = dto.Description,
            ProjectId = dto.ProjectId,
            TeamLeadUserId = dto.TeamLeadUserId
        };

        _db.Teams.Add(team);
        await _db.SaveChangesAsync();

        return Ok(team);
    }

    [HttpPost("{teamId}/members")]
    public async Task<IActionResult> AddMember(Guid teamId, [FromBody] AddTeamMemberDto dto)
    {
        var teamExists = await _db.Teams.AnyAsync(t => t.Id == teamId);
        if (!teamExists)
            return NotFound(new { message = "Команду не знайдено" });

        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
            return NotFound(new { message = "Користувача не знайдено" });

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