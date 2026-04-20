namespace Squadly.Domain.Entities;

public class Team : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid? TeamLeadUserId { get; set; }
    public User? TeamLead { get; set; }

    public ICollection<TeamMembership> Memberships { get; set; } = new List<TeamMembership>();
}