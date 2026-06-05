namespace Squadly.Application.DTOs.Mentor;

public class MentorProjectDto
{
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TotalMembers { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
}

public class MenteeDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    public int TotalPoints { get; set; }
}

public class MentorNoteDto
{
    public Guid Id { get; set; }
    public Guid AboutUserId { get; set; }
    public Guid ProjectId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateMentorNoteDto
{
    public Guid AboutUserId { get; set; }
    public Guid ProjectId { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class UpdateMentorNoteDto
{
    public string Content { get; set; } = string.Empty;
}

public class AssignMentorDto
{
    public Guid UserId { get; set; }
}