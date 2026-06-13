using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Projects;

public class CreateProjectDto
{
    [Required(ErrorMessage = "Назва проєкту обов'язкова")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Назва має бути від 3 до 200 символів")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Опис не може бути довшим за 2000 символів")]
    public string? Description { get; set; }

    [RegularExpression("^(Development|Design|Marketing|Research|Education|Business|Other)$",
        ErrorMessage = "Невідома категорія")]
    public string Category { get; set; } = "Other";

    [RegularExpression("^(Low|Medium|High)$", ErrorMessage = "Невідомий пріоритет")]
    public string Priority { get; set; } = "Medium";

    [RegularExpression("^(indigo|blue|teal|green|amber|orange|red|purple)$",
        ErrorMessage = "Невідомий колір")]
    public string Color { get; set; } = "indigo";

    public DateTime? StartDate { get; set; }

    public DateTime? Deadline { get; set; }

    [StringLength(1000, ErrorMessage = "Мета не може бути довшою за 1000 символів")]
    public string? Goal { get; set; }

    public List<string>? Tags { get; set; }
}