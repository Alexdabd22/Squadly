using Microsoft.EntityFrameworkCore;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.Infrastructure.Services;

public class ProjectAuthorizationService : IProjectAuthorizationService
{
    private readonly AppDbContext _db;

    public ProjectAuthorizationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsMemberAsync(Guid projectId, Guid userId) =>
        await _db.ProjectMemberships.AnyAsync(m => m.ProjectId == projectId && m.UserId == userId);

    public async Task<bool> HasRoleAsync(Guid projectId, Guid userId, params ProjectRole[] allowedRoles) =>
        await _db.ProjectMemberships.AnyAsync(m =>
            m.ProjectId == projectId &&
            m.UserId == userId &&
            allowedRoles.Contains(m.Role));

    public async Task EnsureMemberAsync(Guid projectId, Guid userId)
    {
        if (!await IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("Ви не є учасником цього проєкту");
    }

    public async Task EnsureRoleAsync(Guid projectId, Guid userId, params ProjectRole[] allowedRoles)
    {
        if (!await HasRoleAsync(projectId, userId, allowedRoles))
            throw new UnauthorizedAccessException("Недостатньо прав для цієї дії");
    }
}