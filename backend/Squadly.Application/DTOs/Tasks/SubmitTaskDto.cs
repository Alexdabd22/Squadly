using System.ComponentModel.DataAnnotations;

namespace Squadly.Application.DTOs.Tasks;

public class SubmitTaskDto
{
    [Required(ErrorMessage = "Опис виконаної роботи обов'язковий")]
    [StringLength(3000, MinimumLength = 10, ErrorMessage = "Опис має бути від 10 до 3000 символів")]
    public string WhatWasDone { get; set; } = string.Empty;

    public List<string>? Links { get; set; }

    [Range(0.1, 24, ErrorMessage = "Кількість годин від 0.1 до 24")]
    public decimal? HoursSpent { get; set; }

    public bool SelfChecked { get; set; } = false;
}