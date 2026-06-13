namespace Squadly.Application.DTOs.Projects;

public class ProjectDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string Priority { get; set; } = "Medium";
    public string Color { get; set; } = "indigo";
    public DateTime? StartDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string? Goal { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public string? CurrentUserRole { get; set; }
}