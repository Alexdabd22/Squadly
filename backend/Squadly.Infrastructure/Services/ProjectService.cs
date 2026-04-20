using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Projects;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.Infrastructure.Services;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _db;
    private readonly IProjectAuthorizationService _auth;

    public ProjectService(AppDbContext db, IProjectAuthorizationService auth)
    {
        _db = db;
        _auth = auth;
    }

    public async Task<List<ProjectDto>> GetAllAsync(Guid currentUserId)
    {
        var projects = await _db.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Memberships)
            .Where(p => !p.IsDeleted && p.Memberships.Any(m => m.UserId == currentUserId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return projects.Select(p => MapToDto(p, currentUserId)).ToList();
    }

    public async Task<ProjectDto?> GetByIdAsync(Guid projectId, Guid currentUserId)
    {
        await _auth.EnsureMemberAsync(projectId, currentUserId);

        var project = await _db.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Memberships)
            .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);

        return project is null ? null : MapToDto(project, currentUserId);
    }

    public async Task<ProjectDto> CreateAsync(CreateProjectDto dto, Guid currentUserId)
    {
        var project = new Project
        {
            Title = dto.Title,
            Description = dto.Description,
            Deadline = dto.Deadline,
            CreatedByUserId = currentUserId
        };

        // Creator автоматично стає Organizer
        project.Memberships.Add(new ProjectMembership
        {
            UserId = currentUserId,
            Role = ProjectRole.Organizer
        });

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(project.Id, currentUserId))!;
    }

    public async Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectDto dto, Guid currentUserId)
    {
        // Тільки Organizer може редагувати
        await _auth.EnsureRoleAsync(projectId, currentUserId, ProjectRole.Organizer);

        var project = await _db.Projects
            .Include(p => p.Memberships)
            .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Проєкт не знайдено");

        project.Title = dto.Title;
        project.Description = dto.Description;
        project.Deadline = dto.Deadline;
        project.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<ProjectStatus>(dto.Status, out var status))
            project.Status = status;

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(projectId, currentUserId))!;
    }

    public async Task DeleteAsync(Guid projectId, Guid currentUserId)
    {
        // Тільки Organizer може видаляти
        await _auth.EnsureRoleAsync(projectId, currentUserId, ProjectRole.Organizer);

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Проєкт не знайдено");

        project.IsDeleted = true;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private ProjectDto MapToDto(Project p, Guid currentUserId) => new()
    {
        Id = p.Id,
        Title = p.Title,
        Description = p.Description,
        Status = p.Status.ToString(),
        Deadline = p.Deadline,
        CreatedAt = p.CreatedAt,
        CreatedByUserId = p.CreatedByUserId,
        CreatedByUserName = p.CreatedByUser?.FullName ?? string.Empty,
        MemberCount = p.Memberships.Count,
        CurrentUserRole = p.Memberships.FirstOrDefault(m => m.UserId == currentUserId)?.Role.ToString()
    };
}