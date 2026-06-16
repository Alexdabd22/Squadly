using Microsoft.AspNetCore.SignalR;
using Squadly.API.Hubs;
using Squadly.Infrastructure.Services;

namespace Squadly.API.Services;

public class SignalRNotifier : IRealtimeNotifier
{
    private readonly IHubContext<NotificationHub> _hub;

    public SignalRNotifier(IHubContext<NotificationHub> hub)
    {
        _hub = hub;
    }

    public async Task PushUnreadCountAsync(Guid userId, int count)
    {
        await _hub.Clients
            .User(userId.ToString())
            .SendAsync("UnreadCountChanged", count);
    }

    public async Task PushGlobalRoleChangedAsync(Guid userId, string newRole)
    {
        await _hub.Clients
            .User(userId.ToString())
            .SendAsync("GlobalRoleChanged", newRole);
    }
}
