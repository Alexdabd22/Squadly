namespace Squadly.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();

    public ICollection<ProjectMembership> ProjectMemberships { get; set; } = new List<ProjectMembership>();
    public ICollection<TeamMembership> TeamMemberships { get; set; } = new List<TeamMembership>();
    
    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}