namespace Squadly.Domain.Entities;

public class TaskItem : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string Status { get; set; } = "ToDo";
    public string Priority { get; set; } = "Medium";

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public Guid? AssigneeUserId { get; set; }
    public User? Assignee { get; set; }

    public DateTime? DueDate { get; set; }

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}