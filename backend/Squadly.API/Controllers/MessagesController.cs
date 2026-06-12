using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Squadly.API.Hubs;
using Squadly.Application.DTOs.Messages;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<ChatHub> _hub;
    private readonly IProjectAuthorizationService _auth;

    public MessagesController(AppDbContext db, IHubContext<ChatHub> hub, IProjectAuthorizationService auth)
    {
        _db = db;
        _hub = hub;
        _auth = auth;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    // === PROJECT MESSAGES ===

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectMessages(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId && !p.IsDeleted);
        if (!projectExists) return NotFound(new { message = "Проєкт не знайдено" });

        if (!await _auth.IsMemberAsync(projectId, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var messages = await _db.ProjectMessages
            .Where(m => m.ProjectId == projectId)
            .Include(m => m.Author)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MessageDto
            {
                Id = m.Id,
                Content = m.Content,
                AuthorUserId = m.AuthorUserId,
                AuthorName = m.Author != null ? m.Author.FirstName + " " + m.Author.LastName : "Невідомий",
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("project/{projectId}")]
    public async Task<IActionResult> CreateProjectMessage(Guid projectId, [FromBody] CreateMessageDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Повідомлення не може бути порожнім" });

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId && !p.IsDeleted);
        if (!projectExists) return NotFound(new { message = "Проєкт не знайдено" });

        if (!await _auth.IsMemberAsync(projectId, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var msg = new ProjectMessage
        {
            ProjectId = projectId,
            AuthorUserId = userId.Value,
            Content = dto.Content.Trim()
        };

        _db.ProjectMessages.Add(msg);
        await _db.SaveChangesAsync();
        await _db.Entry(msg).Reference(m => m.Author).LoadAsync();

        var dtoResult = new MessageDto
        {
            Id = msg.Id,
            Content = msg.Content,
            AuthorUserId = msg.AuthorUserId,
            AuthorName = msg.Author != null ? msg.Author.FirstName + " " + msg.Author.LastName : "Невідомий",
            CreatedAt = msg.CreatedAt
        };

        await _hub.Clients.Group($"project-{projectId}").SendAsync("MessageReceived", dtoResult);

        return Ok(dtoResult);
    }

    [HttpDelete("project/{projectId}/{messageId}")]
    public async Task<IActionResult> DeleteProjectMessage(Guid projectId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var msg = await _db.ProjectMessages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ProjectId == projectId);

        if (msg == null)
            return NotFound(new { message = "Повідомлення не знайдено" });

        var isOrganizer = await _auth.HasRoleAsync(projectId, userId.Value, ProjectRole.Organizer);

        if (msg.AuthorUserId != userId.Value && !isOrganizer)
            return StatusCode(403, new { message = "Ви можете видаляти лише свої повідомлення" });

        _db.ProjectMessages.Remove(msg);
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"project-{projectId}").SendAsync("MessageDeleted", messageId);

        return Ok(new { message = "Видалено" });
    }
}