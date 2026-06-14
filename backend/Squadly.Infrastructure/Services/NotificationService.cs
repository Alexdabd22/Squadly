using Microsoft.EntityFrameworkCore;
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

// Інтерфейс реалізується в API-шарі через SignalR
public interface IRealtimeNotifier
{
    Task PushUnreadCountAsync(Guid userId, int count);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier? _notifier;

    public NotificationService(AppDbContext db, IRealtimeNotifier? notifier = null)
    {
        _db = db;
        _notifier = notifier;
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

        if (_notifier != null)
        {
            var unreadCount = await _db.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
            await _notifier.PushUnreadCountAsync(userId, unreadCount);
        }
    }
}
