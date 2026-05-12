namespace Squadly.Domain.Entities;

public class Rating : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public int Points { get; set; }

    public string Reason { get; set; } = string.Empty;
    // "TaskCompleted_High", "TaskCompleted_Medium", "TaskCompleted_Low", "CommentAdded"

    public Guid? RelatedId { get; set; }
    public string? RelatedType { get; set; }
    // "Task", "Comment"
}