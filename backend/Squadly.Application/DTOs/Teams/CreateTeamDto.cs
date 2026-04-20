namespace Squadly.Application.DTOs.Teams;

public class CreateTeamDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? TeamLeadUserId { get; set; }
}