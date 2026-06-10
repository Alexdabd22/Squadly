using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Projects;

public class UpdateProjectDto
{
    [Required(ErrorMessage = "Назва проєкту обов'язкова")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Назва має бути від 3 до 200 символів")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Опис не може бути довшим за 2000 символів")]
    public string? Description { get; set; }

    public DateTime? Deadline { get; set; }

    public string? Status { get; set; }
}