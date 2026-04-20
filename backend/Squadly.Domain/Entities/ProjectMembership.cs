namespace Squadly.Domain.Entities;

public class ProjectMembership : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public ProjectRole Role { get; set; } = ProjectRole.Participant;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public enum ProjectRole
{
    Participant = 0,
    Organizer = 1,
    Mentor = 2
}