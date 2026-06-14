using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Squadly.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{

}
