namespace Squadly.Domain.Entities;

public class MentorNote : BaseEntity
{
    // Хто залишив нотатку (ментор)
    public Guid MentorUserId { get; set; }
    public User? Mentor { get; set; }

    // Про кого нотатка (підопічний)
    public Guid AboutUserId { get; set; }
    public User? AboutUser { get; set; }

    // У якому проєкті
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Content { get; set; } = string.Empty;
}