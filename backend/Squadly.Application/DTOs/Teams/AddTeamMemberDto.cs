using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Teams;

public class AddTeamMemberDto
{
    [Required(ErrorMessage = "ID користувача обов'язковий")]
    public Guid UserId { get; set; }

    [Required(ErrorMessage = "Роль обов'язкова")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Роль має бути від 2 до 50 символів")]
    public string Role { get; set; } = "Member";
}