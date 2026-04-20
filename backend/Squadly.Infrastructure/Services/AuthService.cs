using Microsoft.EntityFrameworkCore;
using Squadly.Application.DTOs.Auth;
using Squadly.Application.Interfaces;
using Squadly.Domain.Entities;
using Squadly.Infrastructure.Persistence;

namespace Squadly.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;

    public AuthService(AppDbContext db, IJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResultDto> RegisterAsync(RegisterDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
            throw new InvalidOperationException("Email вже використовується");

        if (dto.Password.Length < 8)
            throw new ArgumentException("Пароль має бути не менше 8 символів");

        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return BuildResult(user);
    }

    public async Task<AuthResultDto> LoginAsync(LoginDto dto)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower())
            ?? throw new UnauthorizedAccessException("Невірний email або пароль");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Невірний email або пароль");

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return BuildResult(user);
    }

    private AuthResultDto BuildResult(User user) => new()
    {
        AccessToken = _jwt.GenerateToken(user),
        ExpiresAt = _jwt.GetTokenExpiration(),
        User = new AuthUserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName
        }
    };
}
