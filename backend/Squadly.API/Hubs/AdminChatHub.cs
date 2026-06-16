using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Squadly.API.Hubs;

[Authorize]
public class AdminChatHub : Hub
{
    public Task JoinUserThread()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId == null
            ? Task.CompletedTask
            : Groups.AddToGroupAsync(Context.ConnectionId, $"adminchat-user-{userId}");
    }

    public Task JoinAdminThreadFor(string userId)
        => Groups.AddToGroupAsync(Context.ConnectionId, $"adminchat-user-{userId}");

    public Task LeaveAdminThreadFor(string userId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"adminchat-user-{userId}");

    public Task JoinAdminPool()
        => Groups.AddToGroupAsync(Context.ConnectionId, "adminchat-admins");
}