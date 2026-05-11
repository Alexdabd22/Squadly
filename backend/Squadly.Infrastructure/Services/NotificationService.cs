using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.Infrastructure.Services;

public interface INotificationService
{
    Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string message,
        Guid? relatedId = null,
        string? relatedType = null);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string message,
        Guid? relatedId = null,
        string? relatedType = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            RelatedId = relatedId,
            RelatedType = relatedType,
            IsRead = false
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
    }
}