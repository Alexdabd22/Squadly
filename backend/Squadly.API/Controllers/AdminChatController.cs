using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Squadly.API.Hubs;
using Squadly.Application.DTOs.AdminChat;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize]
[Route("api/admin-chat")]
public class AdminChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<AdminChatHub> _hub;

    public AdminChatController(AppDbContext db, IHubContext<AdminChatHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private bool IsAdmin() => User.IsInRole("Admin");

    // === USER side: моя історія з адмінами ===
    [HttpGet("my-thread")]
    public async Task<IActionResult> GetMyThread()
    {
        var me = GetUserId();
        var messages = await _db.AdminChatMessages
            .Where(m => m.UserId == me)
            .Include(m => m.Sender)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new AdminChatMessageDto
            {
                Id = m.Id,
                UserId = m.UserId,
                SenderUserId = m.SenderUserId,
                SenderName = m.Sender == null ? "—" : m.Sender.FirstName + " " + m.Sender.LastName,
                FromAdmin = m.FromAdmin,
                Content = m.Content,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
            })
            .ToListAsync();
        var unreadAdmin = await _db.AdminChatMessages
            .Where(m => m.UserId == me && m.FromAdmin && !m.IsRead)
            .ToListAsync();
        foreach (var m in unreadAdmin) { m.IsRead = true; m.ReadAt = DateTime.UtcNow; }
        if (unreadAdmin.Count > 0) await _db.SaveChangesAsync();

        return Ok(messages);
    }

    // === USER side: написати в підтримку ===
    [HttpPost("send")]
    public async Task<IActionResult> SendAsUser([FromBody] SendAdminMessageDto dto)
    {
        var me = GetUserId();
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Повідомлення не може бути порожнім" });
        if (dto.Content.Length > 4000)
            return BadRequest(new { message = "Занадто довге повідомлення" });

        var user = await _db.Users.FindAsync(me);
        if (user == null) return Unauthorized();

        var msg = new AdminChatMessage
        {
            UserId = me,
            SenderUserId = me,
            FromAdmin = false,
            Content = dto.Content.Trim(),
        };
        _db.AdminChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        var dtoOut = new AdminChatMessageDto
        {
            Id = msg.Id,
            UserId = msg.UserId,
            SenderUserId = msg.SenderUserId,
            SenderName = $"{user.FirstName} {user.LastName}",
            FromAdmin = false,
            Content = msg.Content,
            IsRead = false,
            CreatedAt = msg.CreatedAt,
        };

        await _hub.Clients.Group($"adminchat-user-{me}").SendAsync("NewMessage", dtoOut);
        await _hub.Clients.Group("adminchat-admins").SendAsync("NewMessage", dtoOut);

        return Ok(dtoOut);
    }

    // === USER side: скільки в мене непрочитаних від адмінів ===
    [HttpGet("my-unread-count")]
    public async Task<IActionResult> MyUnreadCount()
    {
        var me = GetUserId();
        var n = await _db.AdminChatMessages
            .CountAsync(m => m.UserId == me && m.FromAdmin && !m.IsRead);
        return Ok(new { count = n });
    }

    // === ADMIN side: список діалогів з фільтром по email ===
    [HttpGet("threads")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetThreads([FromQuery] string? search)
    {
        var userIdsWithMessages = await _db.AdminChatMessages
            .Select(m => m.UserId).Distinct().ToListAsync();

        var query = _db.Users.Where(u => userIdsWithMessages.Contains(u.Id));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(s)
                || (u.FirstName + " " + u.LastName).ToLower().Contains(s));
        }
        var users = await query.ToListAsync();

        var threads = new List<AdminChatThreadDto>();
        foreach (var u in users)
        {
            var last = await _db.AdminChatMessages
                .Where(m => m.UserId == u.Id)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            var unread = await _db.AdminChatMessages
                .CountAsync(m => m.UserId == u.Id && !m.FromAdmin && !m.IsRead);

            threads.Add(new AdminChatThreadDto
            {
                UserId = u.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                Email = u.Email,
                GlobalRole = u.GlobalRole.ToString(),
                LastMessage = last?.Content,
                LastMessageAt = last?.CreatedAt,
                LastMessageFromAdmin = last?.FromAdmin ?? false,
                UnreadFromUser = unread,
            });
        }

        return Ok(threads.OrderByDescending(t => t.LastMessageAt));
    }

    // === ADMIN side: історія конкретного діалогу ===
    [HttpGet("threads/{userId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetThread(Guid userId)
    {
        var messages = await _db.AdminChatMessages
            .Where(m => m.UserId == userId)
            .Include(m => m.Sender)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new AdminChatMessageDto
            {
                Id = m.Id,
                UserId = m.UserId,
                SenderUserId = m.SenderUserId,
                SenderName = m.Sender == null ? "—" : m.Sender.FirstName + " " + m.Sender.LastName,
                FromAdmin = m.FromAdmin,
                Content = m.Content,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
            })
            .ToListAsync();

        var unread = await _db.AdminChatMessages
            .Where(m => m.UserId == userId && !m.FromAdmin && !m.IsRead).ToListAsync();
        foreach (var m in unread) { m.IsRead = true; m.ReadAt = DateTime.UtcNow; }
        if (unread.Count > 0) await _db.SaveChangesAsync();

        return Ok(messages);
    }

    // === ADMIN side: відповісти юзеру ===
    [HttpPost("threads/{userId:guid}/send")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SendAsAdmin(Guid userId, [FromBody] SendAdminMessageDto dto)
    {
        var me = GetUserId();
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Повідомлення не може бути порожнім" });
        if (dto.Content.Length > 4000)
            return BadRequest(new { message = "Занадто довге повідомлення" });

        var target = await _db.Users.FindAsync(userId);
        if (target == null) return NotFound(new { message = "Користувача не знайдено" });

        var admin = await _db.Users.FindAsync(me);
        if (admin == null) return Unauthorized();

        var msg = new AdminChatMessage
        {
            UserId = userId,
            SenderUserId = me,
            FromAdmin = true,
            Content = dto.Content.Trim(),
        };
        _db.AdminChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        var dtoOut = new AdminChatMessageDto
        {
            Id = msg.Id,
            UserId = msg.UserId,
            SenderUserId = msg.SenderUserId,
            SenderName = $"{admin.FirstName} {admin.LastName}",
            FromAdmin = true,
            Content = msg.Content,
            IsRead = false,
            CreatedAt = msg.CreatedAt,
        };

        await _hub.Clients.Group($"adminchat-user-{userId}").SendAsync("NewMessage", dtoOut);
        await _hub.Clients.Group("adminchat-admins").SendAsync("NewMessage", dtoOut);

        return Ok(dtoOut);
    }
}