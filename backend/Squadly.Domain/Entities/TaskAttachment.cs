namespace Squadly.Domain.Entities;

public class TaskAttachment : BaseEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }

    public Guid UploadedByUserId { get; set; }
    public User? UploadedBy { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
}