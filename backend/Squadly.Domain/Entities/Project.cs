namespace Squadly.Domain.Entities;

public class Project : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;

    public ProjectCategory Category { get; set; } = ProjectCategory.Other;
    public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;
    public string Color { get; set; } = "indigo";
    public DateTime? StartDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string? Goal { get; set; }
    public List<string> Tags { get; set; } = new();

    public string? WikiContent { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public ICollection<ProjectMembership> Memberships { get; set; } = new List<ProjectMembership>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}

public enum ProjectStatus
{
    Active = 0,
    Completed = 1,
    Archived = 2
}