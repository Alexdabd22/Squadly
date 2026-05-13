namespace Squadly.Domain.Entities;

public class ProjectMessage : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }

    public string Content { get; set; } = string.Empty;
}
