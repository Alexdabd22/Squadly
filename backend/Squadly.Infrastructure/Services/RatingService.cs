using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.Infrastructure.Services;

public interface IRatingService
{
    Task AwardForTaskCompletionAsync(Guid userId, string priority, Guid taskId);
    Task AwardForCommentAsync(Guid userId, Guid commentId);
}

public class RatingService : IRatingService
{
    private readonly AppDbContext _db;

    public RatingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task AwardForTaskCompletionAsync(Guid userId, string priority, Guid taskId)
    {
        var points = priority switch
        {
            "High" => 20,
            "Medium" => 10,
            "Low" => 5,
            _ => 5
        };

        var rating = new Rating
        {
            UserId = userId,
            Points = points,
            Reason = $"TaskCompleted_{priority}",
            RelatedId = taskId,
            RelatedType = "Task"
        };

        _db.Ratings.Add(rating);
        await _db.SaveChangesAsync();
    }

    public async Task AwardForCommentAsync(Guid userId, Guid commentId)
    {
        var rating = new Rating
        {
            UserId = userId,
            Points = 1,
            Reason = "CommentAdded",
            RelatedId = commentId,
            RelatedType = "Comment"
        };

        _db.Ratings.Add(rating);
        await _db.SaveChangesAsync();
    }
}