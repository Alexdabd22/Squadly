namespace Squadly.Domain.Entities;

public class WikiPage : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Title { get; set; } = "Без назви";
    public string Content { get; set; } = string.Empty;
    public int Order { get; set; } = 0;

    public Guid CreatedByUserId { get; set; }
    public User? CreatedBy { get; set; }
}