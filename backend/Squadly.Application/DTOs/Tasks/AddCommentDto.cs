namespace Squadly.Application.DTOs.Tasks;

public class AddCommentDto
{
    public Guid AuthorUserId { get; set; }
    public string Content { get; set; } = string.Empty;
}