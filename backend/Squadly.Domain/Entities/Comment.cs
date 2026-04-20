namespace Squadly.Domain.Entities;

public class Comment : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public Guid TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }

    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }
}