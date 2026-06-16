using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Wiki;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/wiki")]
public class WikiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAuthorizationService _auth;

    public WikiController(AppDbContext db, IProjectAuthorizationService auth)
    {
        _db = db;
        _auth = auth;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<bool> IsMember(Guid projectId)
        => await _auth.IsMemberAsync(projectId, GetUserId());

    private async Task<bool> IsOrganizer(Guid projectId)
    {
        var me = GetUserId();
        return await _db.ProjectMemberships
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == me && pm.Role == ProjectRole.Organizer);
    }

    // GET /api/projects/{id}/wiki — список сторінок
    [HttpGet]
    public async Task<IActionResult> List(Guid projectId)
    {
        if (!await IsMember(projectId)) return StatusCode(403, new { message = "Немає доступу" });

        var pages = await _db.WikiPages
            .Where(p => p.ProjectId == projectId)
            .OrderBy(p => p.Order).ThenBy(p => p.CreatedAt)
            .Select(p => new WikiPageListItemDto
            {
                Id = p.Id, Title = p.Title, Order = p.Order
            })
            .ToListAsync();

        return Ok(pages);
    }

    // GET /api/projects/{id}/wiki/{pageId}
    [HttpGet("{pageId:guid}")]
    public async Task<IActionResult> GetOne(Guid projectId, Guid pageId)
    {
        if (!await IsMember(projectId)) return StatusCode(403, new { message = "Немає доступу" });

        var page = await _db.WikiPages.FirstOrDefaultAsync(p => p.Id == pageId && p.ProjectId == projectId);
        if (page == null) return NotFound();

        return Ok(new WikiPageDto
        {
            Id = page.Id,
            ProjectId = page.ProjectId,
            Title = page.Title,
            Content = page.Content,
            Order = page.Order,
            CreatedAt = page.CreatedAt,
            UpdatedAt = page.UpdatedAt,
        });
    }

    // POST /api/projects/{id}/wiki — створити сторінку (тільки організатор)
    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateWikiPageDto dto)
    {
        if (!await IsOrganizer(projectId))
            return StatusCode(403, new { message = "Лише організатор може створювати сторінки" });

        var nextOrder = (await _db.WikiPages.Where(p => p.ProjectId == projectId).MaxAsync(p => (int?)p.Order) ?? 0) + 1;

        var page = new WikiPage
        {
            ProjectId = projectId,
            Title = dto.Title.Trim(),
            Content = dto.Content?.Trim() ?? string.Empty,
            Order = nextOrder,
            CreatedByUserId = GetUserId(),
        };

        _db.WikiPages.Add(page);
        await _db.SaveChangesAsync();

        return Ok(new WikiPageDto
        {
            Id = page.Id,
            ProjectId = page.ProjectId,
            Title = page.Title,
            Content = page.Content,
            Order = page.Order,
            CreatedAt = page.CreatedAt,
        });
    }

    // PUT /api/projects/{id}/wiki/{pageId} — редагувати (організатор)
    [HttpPut("{pageId:guid}")]
    public async Task<IActionResult> Update(Guid projectId, Guid pageId, [FromBody] UpdateWikiPageDto dto)
    {
        if (!await IsOrganizer(projectId))
            return StatusCode(403, new { message = "Лише організатор може редагувати" });

        var page = await _db.WikiPages.FirstOrDefaultAsync(p => p.Id == pageId && p.ProjectId == projectId);
        if (page == null) return NotFound();

        page.Title = dto.Title.Trim();
        page.Content = dto.Content?.Trim() ?? string.Empty;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new WikiPageDto
        {
            Id = page.Id,
            ProjectId = page.ProjectId,
            Title = page.Title,
            Content = page.Content,
            Order = page.Order,
            CreatedAt = page.CreatedAt,
            UpdatedAt = page.UpdatedAt,
        });
    }

    // DELETE /api/projects/{id}/wiki/{pageId} (організатор)
    [HttpDelete("{pageId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid pageId)
    {
        if (!await IsOrganizer(projectId))
            return StatusCode(403, new { message = "Лише організатор може видаляти" });

        var page = await _db.WikiPages.FirstOrDefaultAsync(p => p.Id == pageId && p.ProjectId == projectId);
        if (page == null) return NotFound();

        _db.WikiPages.Remove(page);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Сторінку видалено" });
    }
}