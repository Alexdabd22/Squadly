using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Squadly.API.Hubs;
using Squadly.Application.DTOs.Messages;
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

    public MessagesController(AppDbContext db, IHubContext<ChatHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    // === TEAM MESSAGES ===

    [HttpGet("team/{teamId}")]
    public async Task<IActionResult> GetTeamMessages(Guid teamId)
    {
        var messages = await _db.TeamMessages
            .Where(m => m.TeamId == teamId)
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

    [HttpPost("team/{teamId}")]
    public async Task<IActionResult> CreateTeamMessage(Guid teamId, [FromBody] CreateMessageDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Повідомлення не може бути порожнім" });

        var teamExists = await _db.Teams.AnyAsync(t => t.Id == teamId);
        if (!teamExists)
            return NotFound(new { message = "Команду не знайдено" });

        var msg = new TeamMessage
        {
            TeamId = teamId,
            AuthorUserId = userId.Value,
            Content = dto.Content.Trim()
        };

        _db.TeamMessages.Add(msg);
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

        // Розіслати всім хто у групі цієї команди
        await _hub.Clients.Group($"team-{teamId}").SendAsync("MessageReceived", dtoResult);

        return Ok(dtoResult);
    }

    [HttpDelete("team/{teamId}/{messageId}")]
    public async Task<IActionResult> DeleteTeamMessage(Guid teamId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var msg = await _db.TeamMessages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.TeamId == teamId);

        if (msg == null)
            return NotFound(new { message = "Повідомлення не знайдено" });

        if (msg.AuthorUserId != userId.Value)
            return Forbid();

        _db.TeamMessages.Remove(msg);
        await _db.SaveChangesAsync();

        // Розіслати всім у групі
        await _hub.Clients.Group($"team-{teamId}").SendAsync("MessageDeleted", messageId);

        return Ok(new { message = "Видалено" });
    }

    // === PROJECT MESSAGES ===

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectMessages(Guid projectId)
    {
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

        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId);
        if (!projectExists)
            return NotFound(new { message = "Проєкт не знайдено" });

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

        // Розіслати всім хто у групі цього проєкту
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

        if (msg.AuthorUserId != userId.Value)
            return Forbid();

        _db.ProjectMessages.Remove(msg);
        await _db.SaveChangesAsync();

        // Розіслати всім у групі
        await _hub.Clients.Group($"project-{projectId}").SendAsync("MessageDeleted", messageId);

        return Ok(new { message = "Видалено" });
    }
}