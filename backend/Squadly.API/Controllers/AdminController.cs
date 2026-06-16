using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Admin;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;
using Squadly.Infrastructure.Services;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier _notifier;

    public AdminController(AppDbContext db, IRealtimeNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.FirstName)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                FullName = u.FirstName + " " + u.LastName,
                GlobalRole = u.GlobalRole.ToString(),
                u.CreatedAt,
                u.LastLoginAt,
                ProjectsCreated = _db.Projects.Count(p => p.CreatedByUserId == u.Id && !p.IsDeleted)
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT /api/admin/users/{id}/global-role
    [HttpPut("users/{id:guid}/global-role")]
    public async Task<IActionResult> UpdateGlobalRole(Guid id, [FromBody] UpdateGlobalRoleDto dto)
    {
        var currentUserId = GetUserId();

        if (id == currentUserId)
            return BadRequest(new { message = "Ви не можете змінити власну роль" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        if (!Enum.TryParse<GlobalRole>(dto.GlobalRole, out var newRole))
            return BadRequest(new { message = "Невідома роль" });

        user.GlobalRole = newRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _notifier.PushGlobalRoleChangedAsync(id, user.GlobalRole.ToString());

        return Ok(new
        {
            user.Id,
            user.Email,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString()
        });
    }

    // GET /api/admin/projects
    [HttpGet("projects")]
    public async Task<IActionResult> GetAllProjects()
    {
        var projects = await _db.Projects
            .Where(p => !p.IsDeleted)
            .Include(p => p.CreatedByUser)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Description,
                p.CreatedAt,
                Owner = p.CreatedByUser == null ? null : new
                {
                    p.CreatedByUser.Id,
                    p.CreatedByUser.Email,
                    FullName = p.CreatedByUser.FirstName + " " + p.CreatedByUser.LastName
                },
                MembersCount = _db.ProjectMemberships.Count(pm => pm.ProjectId == p.Id),
                TasksCount = _db.Tasks.Count(t => t.ProjectId == p.Id),
                TasksDone = _db.Tasks.Count(t => t.ProjectId == p.Id && t.Status == "Done")
            })
            .ToListAsync();

        return Ok(projects);
    }

    // GET /api/admin/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalAdmins = await _db.Users.CountAsync(u => u.GlobalRole == GlobalRole.Admin);
        var totalOrganizers = await _db.Users.CountAsync(u => u.GlobalRole == GlobalRole.Organizer);
        var totalProjects = await _db.Projects.CountAsync(p => !p.IsDeleted);
        var totalTasks = await _db.Tasks.CountAsync();

        return Ok(new
        {
            totalUsers,
            totalAdmins,
            totalOrganizers,
            totalProjects,
            totalTasks
        });
    }

    // PUT /api/admin/users/{id}
    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] AdminUpdateUserDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        // Перевірка унікальності email
        var newEmail = dto.Email.Trim().ToLower();
        if (newEmail != user.Email.ToLower())
        {
            var emailTaken = await _db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == newEmail);
            if (emailTaken)
                return BadRequest(new { message = "Цей email вже використовується" });
        }

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.Email = dto.Email.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = user.FirstName + " " + user.LastName,
            GlobalRole = user.GlobalRole.ToString()
        });
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var currentUserId = GetUserId();
        if (id == currentUserId)
            return BadRequest(new { message = "Ви не можете видалити власний акаунт" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено" });

        // видалення проекту де власник та людина яку видаляємо
        var ownedProjectIds = await _db.Projects
            .Where(p => p.CreatedByUserId == id)
            .Select(p => p.Id)
            .ToListAsync();

        if (ownedProjectIds.Count > 0)
        {
            var projectTaskIds = await _db.Tasks
                .Where(t => ownedProjectIds.Contains(t.ProjectId))
                .Select(t => t.Id)
                .ToListAsync();

            var projSubs = await _db.TaskSubmissions
                .Where(s => projectTaskIds.Contains(s.TaskItemId))
                .ToListAsync();
            _db.TaskSubmissions.RemoveRange(projSubs);

            var projAtts = await _db.TaskAttachments
                .Where(a => projectTaskIds.Contains(a.TaskItemId))
                .ToListAsync();
            _db.TaskAttachments.RemoveRange(projAtts);

            var projComments = await _db.Comments
                .Where(c => projectTaskIds.Contains(c.TaskItemId))
                .ToListAsync();
            _db.Comments.RemoveRange(projComments);

            var projTasks = await _db.Tasks
                .Where(t => ownedProjectIds.Contains(t.ProjectId))
                .ToListAsync();
            _db.Tasks.RemoveRange(projTasks);

            var projMessages = await _db.ProjectMessages
                .Where(m => ownedProjectIds.Contains(m.ProjectId))
                .ToListAsync();
            _db.ProjectMessages.RemoveRange(projMessages);

            var projMemberships = await _db.ProjectMemberships
                .Where(pm => ownedProjectIds.Contains(pm.ProjectId))
                .ToListAsync();
            _db.ProjectMemberships.RemoveRange(projMemberships);

            var projNotes = await _db.MentorNotes
                .Where(n => ownedProjectIds.Contains(n.ProjectId))
                .ToListAsync();
            _db.MentorNotes.RemoveRange(projNotes);

            var ownedProjects = await _db.Projects
                .Where(p => ownedProjectIds.Contains(p.Id))
                .ToListAsync();
            _db.Projects.RemoveRange(ownedProjects);

            await _db.SaveChangesAsync();
        }

        // видалення користувача в інших проектах

        var comments = await _db.Comments.Where(c => c.AuthorUserId == id).ToListAsync();
        _db.Comments.RemoveRange(comments);

        var messages = await _db.ProjectMessages.Where(m => m.AuthorUserId == id).ToListAsync();
        _db.ProjectMessages.RemoveRange(messages);

        var ratings = await _db.Ratings.Where(r => r.UserId == id).ToListAsync();
        _db.Ratings.RemoveRange(ratings);

        var notifications = await _db.Notifications.Where(n => n.UserId == id).ToListAsync();
        _db.Notifications.RemoveRange(notifications);

        var mentorNotes = await _db.MentorNotes
            .Where(n => n.MentorUserId == id || n.AboutUserId == id)
            .ToListAsync();
        _db.MentorNotes.RemoveRange(mentorNotes);

        var submissions = await _db.TaskSubmissions.Where(s => s.SubmittedByUserId == id).ToListAsync();
        _db.TaskSubmissions.RemoveRange(submissions);

        var attachments = await _db.TaskAttachments.Where(a => a.UploadedByUserId == id).ToListAsync();
        _db.TaskAttachments.RemoveRange(attachments);

        var assignedTasks = await _db.Tasks
            .Where(t => t.AssigneeUserId == id
                || t.ReviewClaimedByUserId == id
                || t.ReviewedByUserId == id)
            .ToListAsync();
        foreach (var t in assignedTasks)
        {
            if (t.AssigneeUserId == id) t.AssigneeUserId = null;
            if (t.ReviewClaimedByUserId == id) { t.ReviewClaimedByUserId = null; t.ReviewClaimedAt = null; }
            if (t.ReviewedByUserId == id) t.ReviewedByUserId = null;
        }

        var memberships = await _db.ProjectMemberships.Where(pm => pm.UserId == id).ToListAsync();
        _db.ProjectMemberships.RemoveRange(memberships);

        _db.Users.Remove(user);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Користувача видалено" });
    }

    // PUT /api/admin/projects/{id}
    [HttpPut("projects/{id:guid}")]
    public async Task<IActionResult> UpdateProject(Guid id, [FromBody] AdminUpdateProjectDto dto)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (project == null)
            return NotFound(new { message = "Проєкт не знайдено" });

        project.Title = dto.Title.Trim();
        project.Description = dto.Description?.Trim();
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { project.Id, project.Title, project.Description });
    }

    // DELETE /api/admin/projects/{id}
    [HttpDelete("projects/{id:guid}")]
    public async Task<IActionResult> DeleteProject(Guid id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (project == null)
            return NotFound(new { message = "Проєкт не знайдено" });

        project.IsDeleted = true;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Користувача видалено" });
    }
}