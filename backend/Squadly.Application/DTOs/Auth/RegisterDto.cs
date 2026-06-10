using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Auth;

public class RegisterDto
{
    [Required(ErrorMessage = "Ім'я обов'язкове")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Ім'я має бути від 2 до 100 символів")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Прізвище обов'язкове")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Прізвище має бути від 2 до 100 символів")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email обов'язковий")]
    [EmailAddress(ErrorMessage = "Невірний формат email")]
    [StringLength(256, ErrorMessage = "Email занадто довгий")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Пароль обов'язковий")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Пароль має бути від 6 до 100 символів")]
    public string Password { get; set; } = string.Empty;
}