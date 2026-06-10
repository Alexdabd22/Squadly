using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Tasks;

public class AddCommentDto
{
    public Guid AuthorUserId { get; set; }

    [Required(ErrorMessage = "Текст коментаря обов'язковий")]
    [StringLength(2000, MinimumLength = 1, ErrorMessage = "Коментар має бути від 1 до 2000 символів")]
    public string Content { get; set; } = string.Empty;
}