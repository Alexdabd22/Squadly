using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Mentor;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MentorController : ControllerBase
{
    private readonly AppDbContext _db;

    public MentorController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetMyProjects()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var projects = await _db.ProjectMemberships
            .Where(pm => pm.UserId == userId.Value && pm.Role == ProjectRole.Mentor)
            .Include(pm => pm.Project)
            .Select(pm => new MentorProjectDto
            {
                ProjectId = pm.ProjectId,
                Title = pm.Project!.Title,
                Description = pm.Project.Description,
                TotalMembers = _db.ProjectMemberships.Count(m => m.ProjectId == pm.ProjectId),
                TotalTasks = _db.Tasks.Count(t => t.ProjectId == pm.ProjectId),
                CompletedTasks = _db.Tasks.Count(t => t.ProjectId == pm.ProjectId && t.Status == "Done")
            })
            .ToListAsync();

        return Ok(projects);
    }

    // === Підопічні в конкретному проєкті ===
    [HttpGet("projects/{projectId}/mentees")]
    public async Task<IActionResult> GetMentees(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var isMentor = await _db.ProjectMemberships
            .AnyAsync(pm => pm.UserId == userId.Value && pm.ProjectId == projectId && pm.Role == ProjectRole.Mentor);
        if (!isMentor) return Forbid();

        var memberships = await _db.ProjectMemberships
            .Where(pm => pm.ProjectId == projectId && pm.UserId != userId.Value)
            .Include(pm => pm.User)
            .ToListAsync();

        var mentees = new List<MenteeDto>();
        foreach (var m in memberships)
        {
            if (m.User == null) continue;

            var userTasks = await _db.Tasks
                .Where(t => t.ProjectId == projectId && t.AssigneeUserId == m.UserId)
                .ToListAsync();

            var points = await _db.Ratings
                .Where(r => r.UserId == m.UserId)
                .SumAsync(r => (int?)r.Points) ?? 0;

            mentees.Add(new MenteeDto
            {
                UserId = m.UserId,
                FullName = $"{m.User.FirstName} {m.User.LastName}",
                Email = m.User.Email,
                Role = m.Role.ToString(),
                TotalTasks = userTasks.Count,
                CompletedTasks = userTasks.Count(t => t.Status == "Done"),
                InProgressTasks = userTasks.Count(t => t.Status == "InProgress"),
                TodoTasks = userTasks.Count(t => t.Status == "ToDo"),
                TotalPoints = points
            });
        }

        return Ok(mentees);
    }

    // === Нотатки про підопічного ===
    [HttpGet("notes/{aboutUserId}/{projectId}")]
    public async Task<IActionResult> GetNotes(Guid aboutUserId, Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var isMentor = await _db.ProjectMemberships
            .AnyAsync(pm => pm.UserId == userId.Value && pm.ProjectId == projectId && pm.Role == ProjectRole.Mentor);
        if (!isMentor) return Forbid();

        var notes = await _db.MentorNotes
            .Where(n => n.MentorUserId == userId.Value && n.AboutUserId == aboutUserId && n.ProjectId == projectId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new MentorNoteDto
            {
                Id = n.Id,
                AboutUserId = n.AboutUserId,
                ProjectId = n.ProjectId,
                Content = n.Content,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            })
            .ToListAsync();

        return Ok(notes);
    }

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote([FromBody] CreateMentorNoteDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Нотатка не може бути порожньою" });

        var isMentor = await _db.ProjectMemberships
            .AnyAsync(pm => pm.UserId == userId.Value && pm.ProjectId == dto.ProjectId && pm.Role == ProjectRole.Mentor);
        if (!isMentor) return Forbid();

        var note = new MentorNote
        {
            MentorUserId = userId.Value,
            AboutUserId = dto.AboutUserId,
            ProjectId = dto.ProjectId,
            Content = dto.Content.Trim()
        };

        _db.MentorNotes.Add(note);
        await _db.SaveChangesAsync();

        return Ok(new MentorNoteDto
        {
            Id = note.Id,
            AboutUserId = note.AboutUserId,
            ProjectId = note.ProjectId,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt
        });
    }

    [HttpPut("notes/{id}")]
    public async Task<IActionResult> UpdateNote(Guid id, [FromBody] UpdateMentorNoteDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var note = await _db.MentorNotes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound();
        if (note.MentorUserId != userId.Value) return Forbid();

        note.Content = dto.Content.Trim();
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new MentorNoteDto
        {
            Id = note.Id,
            AboutUserId = note.AboutUserId,
            ProjectId = note.ProjectId,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt
        });
    }

    [HttpDelete("notes/{id}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var note = await _db.MentorNotes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound();
        if (note.MentorUserId != userId.Value) return Forbid();

        _db.MentorNotes.Remove(note);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Видалено" });
    }

    // === Призначення ментора (для організатора) ===
    [HttpPost("projects/{projectId}/assign")]
    public async Task<IActionResult> AssignMentor(Guid projectId, [FromBody] AssignMentorDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Тільки організатор проєкту може призначати менторів
        var isOrganizer = await _db.ProjectMemberships
            .AnyAsync(pm => pm.UserId == userId.Value && pm.ProjectId == projectId && pm.Role == ProjectRole.Organizer);
        if (!isOrganizer) return Forbid();

        var existing = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.UserId == dto.UserId && pm.ProjectId == projectId);

        if (existing == null)
        {
            _db.ProjectMemberships.Add(new ProjectMembership
            {
                UserId = dto.UserId,
                ProjectId = projectId,
                Role = ProjectRole.Mentor
            });
        }
        else
        {
            existing.Role = ProjectRole.Mentor;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Ментор призначений" });
    }

    [HttpDelete("projects/{projectId}/mentor/{userId}")]
    public async Task<IActionResult> RemoveMentor(Guid projectId, Guid userId)
    {
        var currentUserId = GetUserId();
        if (currentUserId == null) return Unauthorized();

        var isOrganizer = await _db.ProjectMemberships
            .AnyAsync(pm => pm.UserId == currentUserId.Value && pm.ProjectId == projectId && pm.Role == ProjectRole.Organizer);
        if (!isOrganizer) return Forbid();

        var membership = await _db.ProjectMemberships
            .FirstOrDefaultAsync(pm => pm.UserId == userId && pm.ProjectId == projectId && pm.Role == ProjectRole.Mentor);

        if (membership == null) return NotFound();

        membership.Role = ProjectRole.Participant;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Ментора знято" });
    }
    [HttpGet("review-queue")]
    public async Task<IActionResult> GetReviewQueue()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Проєкти де  Mentor або Organizer
        var myProjectIds = await _db.ProjectMemberships
            .Where(pm => pm.UserId == userId.Value
                && (pm.Role == ProjectRole.Mentor || pm.Role == ProjectRole.Organizer))
            .Select(pm => pm.ProjectId)
            .ToListAsync();

        if (myProjectIds.Count == 0)
            return Ok(new List<object>());

        var tasks = await _db.Tasks
            .Where(t => t.Status == "InReview" && myProjectIds.Contains(t.ProjectId))
            .Include(t => t.Assignee)
            .Include(t => t.Project)
            .Include(t => t.ReviewClaimedByUser)
            .OrderByDescending(t => t.UpdatedAt)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                description = t.Description,
                priority = t.Priority,
                dueDate = t.DueDate,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt,
                project = t.Project == null ? null : new
                {
                    id = t.Project.Id,
                    title = t.Project.Title,
                    color = t.Project.Color,
                    category = t.Project.Category.ToString()
                },
                assignee = t.Assignee == null ? null : new
                {
                    id = t.Assignee.Id,
                    fullName = t.Assignee.FirstName + " " + t.Assignee.LastName,
                    email = t.Assignee.Email
                },
                reviewClaimedByUserId = t.ReviewClaimedByUserId,
                reviewClaimedByName = t.ReviewClaimedByUser == null
                    ? null
                    : t.ReviewClaimedByUser.FirstName + " " + t.ReviewClaimedByUser.LastName,
                reviewClaimedAt = t.ReviewClaimedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }
}