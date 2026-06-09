using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Attachments;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IProjectAuthorizationService _auth;
    private const long MaxFileSize = 10 * 1024 * 1024; 

    public AttachmentsController(AppDbContext db, IWebHostEnvironment env, IProjectAuthorizationService auth)
    {
        _db = db;
        _env = env;
        _auth = auth;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    private async Task<Guid?> GetTaskProjectIdAsync(Guid taskId)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        return task?.ProjectId;
    }

    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetTaskAttachments(Guid taskId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var projectId = await GetTaskProjectIdAsync(taskId);
        if (projectId == null) return NotFound(new { message = "Задачу не знайдено" });

        if (!await _auth.IsMemberAsync(projectId.Value, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var attachments = await _db.TaskAttachments
            .Where(a => a.TaskItemId == taskId)
            .Include(a => a.UploadedBy)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                OriginalFileName = a.OriginalFileName,
                ContentType = a.ContentType,
                FileSize = a.FileSize,
                UploadedByUserId = a.UploadedByUserId,
                UploadedByName = a.UploadedBy != null
                    ? a.UploadedBy.FirstName + " " + a.UploadedBy.LastName
                    : "Невідомий",
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpPost("task/{taskId}")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Upload(Guid taskId, IFormFile file)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Файл не вибрано" });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Файл занадто великий (макс. 10 МБ)" });

        var projectId = await GetTaskProjectIdAsync(taskId);
        if (projectId == null) return NotFound(new { message = "Задачу не знайдено" });

        if (!await _auth.IsMemberAsync(projectId.Value, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var ext = Path.GetExtension(file.FileName);
        var safeName = $"{Guid.NewGuid()}{ext}";

        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads");
        if (!Directory.Exists(uploadsDir))
            Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, safeName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new TaskAttachment
        {
            TaskItemId = taskId,
            UploadedByUserId = userId.Value,
            FileName = safeName,
            OriginalFileName = file.FileName,
            ContentType = file.ContentType,
            FileSize = file.Length
        };

        _db.TaskAttachments.Add(attachment);
        await _db.SaveChangesAsync();
        await _db.Entry(attachment).Reference(a => a.UploadedBy).LoadAsync();

        return Ok(new AttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            OriginalFileName = attachment.OriginalFileName,
            ContentType = attachment.ContentType,
            FileSize = attachment.FileSize,
            UploadedByUserId = attachment.UploadedByUserId,
            UploadedByName = attachment.UploadedBy != null
                ? attachment.UploadedBy.FirstName + " " + attachment.UploadedBy.LastName
                : "Невідомий",
            CreatedAt = attachment.CreatedAt
        });
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var attachment = await _db.TaskAttachments.FirstOrDefaultAsync(a => a.Id == id);
        if (attachment == null)
            return NotFound(new { message = "Файл не знайдено" });

        var projectId = await GetTaskProjectIdAsync(attachment.TaskItemId);
        if (projectId == null) return NotFound(new { message = "Задачу не знайдено" });

        if (!await _auth.IsMemberAsync(projectId.Value, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var filePath = Path.Combine(_env.ContentRootPath, "uploads", attachment.FileName);
        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "Файл відсутній на сервері" });

        var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(bytes, attachment.ContentType, attachment.OriginalFileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var attachment = await _db.TaskAttachments.FirstOrDefaultAsync(a => a.Id == id);
        if (attachment == null)
            return NotFound(new { message = "Файл не знайдено" });

        // Видалити може автор або Organizer проєкту
        var projectId = await GetTaskProjectIdAsync(attachment.TaskItemId);
        var isOrganizer = projectId.HasValue
            && await _auth.HasRoleAsync(projectId.Value, userId.Value, ProjectRole.Organizer);

        if (attachment.UploadedByUserId != userId.Value && !isOrganizer)
            return StatusCode(403, new { message = "Ви можете видаляти лише свої файли" });

        var filePath = Path.Combine(_env.ContentRootPath, "uploads", attachment.FileName);
        if (System.IO.File.Exists(filePath))
        {
            try { System.IO.File.Delete(filePath); }
            catch { /* ignore */ }
        }

        _db.TaskAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Видалено" });
    }
}