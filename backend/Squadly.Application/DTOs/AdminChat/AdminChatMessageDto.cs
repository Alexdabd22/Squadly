namespace Squadly.Application.DTOs.AdminChat;

public class AdminChatMessageDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid SenderUserId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public bool FromAdmin { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendAdminMessageDto
{
    public string Content { get; set; } = string.Empty;
}
public class AdminChatThreadDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string GlobalRole { get; set; } = "User";
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public bool LastMessageFromAdmin { get; set; }
    public int UnreadFromUser { get; set; }
}