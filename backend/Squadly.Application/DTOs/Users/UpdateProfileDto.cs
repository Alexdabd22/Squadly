using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Users;

public class UpdateProfileDto
{
    [Required(ErrorMessage = "Ім'я обов'язкове")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Ім'я має бути від 2 до 100 символів")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Прізвище обов'язкове")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Прізвище має бути від 2 до 100 символів")]
    public string LastName { get; set; } = string.Empty;
}