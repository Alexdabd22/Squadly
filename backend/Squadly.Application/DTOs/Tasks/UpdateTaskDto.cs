using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Tasks;

public class UpdateTaskDto
{
    [Required(ErrorMessage = "Назва задачі обов'язкова")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Назва має бути від 2 до 200 символів")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Опис не може бути довшим за 2000 символів")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Статус обов'язковий")]
    [RegularExpression("^(ToDo|InProgress|InReview|Done|NeedsRevision)$", ErrorMessage = "Невірний статус")]
    public string Status { get; set; } = "ToDo";

    [Required(ErrorMessage = "Пріоритет обов'язковий")]
    [RegularExpression("^(Low|Medium|High)$", ErrorMessage = "Невірний пріоритет")]
    public string Priority { get; set; } = "Medium";

    public Guid? AssigneeUserId { get; set; }
    public DateTime? DueDate { get; set; }
}