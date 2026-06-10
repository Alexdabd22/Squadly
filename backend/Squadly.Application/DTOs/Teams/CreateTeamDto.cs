using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Teams;

public class CreateTeamDto
{
    [Required(ErrorMessage = "Назва команди обов'язкова")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Назва має бути від 2 до 200 символів")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Опис не може бути довшим за 1000 символів")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Проєкт обов'язковий")]
    public Guid ProjectId { get; set; }

    public Guid? TeamLeadUserId { get; set; }
}