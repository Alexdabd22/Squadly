using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Tasks;

public class ReviewTaskDto
{
    [StringLength(2000, ErrorMessage = "Коментар не може бути довшим за 2000 символів")]
    public string? Comment { get; set; }
}