namespace Squadly.Domain.Entities;

public class TeamMembership : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid TeamId { get; set; }
    public Team? Team { get; set; }

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}