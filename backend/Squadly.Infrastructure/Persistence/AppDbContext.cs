using Microsoft.EntityFrameworkCore;
using Squadly.Domain.Entities;

namespace Squadly.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMembership> ProjectMemberships => Set<ProjectMembership>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMembership> TeamMemberships => Set<TeamMembership>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(u => u.LastName).IsRequired().HasMaxLength(100);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Ignore(u => u.FullName);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("Projects");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Title).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProjectMembership>(entity =>
        {
            entity.ToTable("ProjectMemberships");
            entity.HasKey(pm => pm.Id);
            entity.Property(pm => pm.Role).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(pm => new { pm.UserId, pm.ProjectId }).IsUnique();

            entity.HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pm => pm.Project)
                .WithMany(p => p.Memberships)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.ToTable("Teams");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Description).HasMaxLength(1000);

            entity.HasOne(t => t.Project)
                .WithMany(p => p.Teams)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.TeamLead)
                .WithMany()
                .HasForeignKey(t => t.TeamLeadUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TeamMembership>(entity =>
        {
            entity.ToTable("TeamMemberships");
            entity.HasKey(tm => tm.Id);
            entity.HasIndex(tm => new { tm.UserId, tm.TeamId }).IsUnique();

            entity.HasOne(tm => tm.User)
                .WithMany(u => u.TeamMemberships)
                .HasForeignKey(tm => tm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tm => tm.Team)
                .WithMany(t => t.Memberships)
                .HasForeignKey(tm => tm.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}