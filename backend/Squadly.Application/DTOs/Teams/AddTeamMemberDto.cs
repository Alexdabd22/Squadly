namespace Squadly.Application.DTOs.Teams;

public class AddTeamMemberDto
{
    public Guid UserId { get; set; }
    public string Role { get; set; } = "Member";
}