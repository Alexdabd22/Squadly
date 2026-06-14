using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/wiki")]
[Authorize]
public class WikiController : ControllerBase
{
    private readonly AppDbContext _db;

    public WikiController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(sub!);
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid projectId)
    {
        var userId = GetUserId();

        var isMember = await _db.ProjectMemberships
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (!isMember)
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var project = await _db.Projects
            .Where(p => p.Id == projectId && !p.IsDeleted)
            .Select(p => new { p.WikiContent })
            .FirstOrDefaultAsync();

        if (project == null)
            return NotFound(new { message = "Проєкт не знайдено" });

        return Ok(new { content = project.WikiContent ?? "" });
    }

    [HttpPut]
    public async Task<IActionResult> Update(Guid projectId, [FromBody] UpdateWikiDto dto)
    {
        var userId = GetUserId();

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership == null)
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        if (membership.Role != ProjectRole.Organizer && membership.Role != ProjectRole.Mentor)
            return StatusCode(403, new { message = "Редагувати Wiki може лише організатор або ментор" });

        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);

        if (project == null)
            return NotFound(new { message = "Проєкт не знайдено" });

        project.WikiContent = dto.Content?.Trim();
        await _db.SaveChangesAsync();

        return Ok(new { content = project.WikiContent ?? "" });
    }
}

public class UpdateWikiDto
{
    public string? Content { get; set; }
}
