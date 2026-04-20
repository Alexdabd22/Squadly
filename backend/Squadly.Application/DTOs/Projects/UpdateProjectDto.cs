namespace Squadly.Application.DTOs.Projects;

public class UpdateProjectDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? Deadline { get; set; }
    public string? Status { get; set; }
}