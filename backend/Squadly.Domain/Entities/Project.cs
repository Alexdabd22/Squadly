namespace Squadly.Domain.Entities;

public class Project : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public DateTime? Deadline { get; set; }
    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public ICollection<ProjectMembership> Memberships { get; set; } = new List<ProjectMembership>();
}

public enum ProjectStatus
{
    Active = 0,
    Completed = 1,
    Archived = 2
}