using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Admin;

public class AdminUpdateUserDto
{
    [Required(ErrorMessage = "Ім'я обов'язкове")]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Прізвище обов'язкове")]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email обов'язковий")]
    [EmailAddress(ErrorMessage = "Невірний формат email")]
    public string Email { get; set; } = string.Empty;
}