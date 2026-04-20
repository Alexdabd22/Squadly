using Squadly.Domain.Entities;

namespace Squadly.Application.Interfaces;

public interface IProjectAuthorizationService
{
    Task<bool> IsMemberAsync(Guid projectId, Guid userId);
    Task<bool> HasRoleAsync(Guid projectId, Guid userId, params ProjectRole[] allowedRoles);
    Task EnsureMemberAsync(Guid projectId, Guid userId);
    Task EnsureRoleAsync(Guid projectId, Guid userId, params ProjectRole[] allowedRoles);
}