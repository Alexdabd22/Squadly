using Squadly.Domain.Entities;

namespace Squadly.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    DateTime GetTokenExpiration();
}