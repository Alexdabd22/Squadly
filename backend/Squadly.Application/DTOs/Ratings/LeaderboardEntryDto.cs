namespace Squadly.Application.DTOs.Ratings;

public class LeaderboardEntryDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int TotalPoints { get; set; }
    public int Rank { get; set; }
    public int TasksCompleted { get; set; }
}

public class UserStatsDto
{
    public Guid UserId { get; set; }
    public int TotalPoints { get; set; }
    public int Rank { get; set; }
    public int TasksCompleted { get; set; }
    public int TasksCompletedHigh { get; set; }
    public int TasksCompletedMedium { get; set; }
    public int TasksCompletedLow { get; set; }
    public int CommentsCount { get; set; }
}