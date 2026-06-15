using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Admin;

public class AdminUpdateProjectDto
{
    [Required(ErrorMessage = "Назва обов'язкова")]
    [StringLength(200, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }
}