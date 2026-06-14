using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Projects;

public class ChangeProjectStatusDto
{
    [Required(ErrorMessage = "Статус обов'язковий")]
    [RegularExpression("^(Active|Completed|Archived)$", ErrorMessage = "Невірний статус")]
    public string Status { get; set; } = "Active";
}