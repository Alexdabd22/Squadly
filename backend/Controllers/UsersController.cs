using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Squadly.Infrastructure.Persistence;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Select(u => new
            {
                u.Id,
                u.Email,
                FullName = u.FirstName + " " + u.LastName,
                u.FirstName,
                u.LastName
            })
            .ToListAsync();

        return Ok(users);
    }
}