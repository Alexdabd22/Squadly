using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Admin;

public class UpdateGlobalRoleDto
{
    [Required(ErrorMessage = "Роль обов'язкова")]
    [RegularExpression("^(User|Organizer|Admin)$", ErrorMessage = "Невідома роль")]
    public string GlobalRole { get; set; } = "User";
}