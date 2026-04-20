using Squadly.Application.DTOs.Projects;

namespace Squadly.Application.Interfaces;

public interface IProjectService
{
    Task<List<ProjectDto>> GetAllAsync(Guid currentUserId);
    Task<ProjectDto?> GetByIdAsync(Guid projectId, Guid currentUserId);
    Task<ProjectDto> CreateAsync(CreateProjectDto dto, Guid currentUserId);
    Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectDto dto, Guid currentUserId);
    Task DeleteAsync(Guid projectId, Guid currentUserId);
}