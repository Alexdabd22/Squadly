namespace Squadly.Domain.Entities;

public class TeamMessage : BaseEntity
{
    public Guid TeamId { get; set; }
    public Team? Team { get; set; }

    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }

    public string Content { get; set; } = string.Empty;
}
