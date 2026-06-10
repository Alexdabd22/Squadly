using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Messages;

public class CreateMessageDto
{
    [Required(ErrorMessage = "Повідомлення не може бути порожнім")]
    [StringLength(2000, MinimumLength = 1, ErrorMessage = "Повідомлення має бути від 1 до 2000 символів")]
    public string Content { get; set; } = string.Empty;
}

public class MessageDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid AuthorUserId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}