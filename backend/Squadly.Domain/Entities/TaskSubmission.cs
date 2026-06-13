namespace Squadly.Domain.Entities;

public class TaskSubmission : BaseEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }

    public Guid SubmittedByUserId { get; set; }
    public User? SubmittedByUser { get; set; }

    public string WhatWasDone { get; set; } = string.Empty;
    public List<string> Links { get; set; } = new();
    public decimal? HoursSpent { get; set; }
    public int SubmissionNumber { get; set; } = 1;
}