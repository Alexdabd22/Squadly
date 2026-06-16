namespace Squadly.Domain.Entities;

public class AdminChatMessage : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid SenderUserId { get; set; }
    public User? Sender { get; set; }

    public bool FromAdmin { get; set; }

    public string Content { get; set; } = string.Empty;

    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
}