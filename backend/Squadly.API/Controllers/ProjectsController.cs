using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Squadly.Application.DTOs.Projects;
using Squadly.Application.Interfaces;

namespace Squadly.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projects;

    public ProjectsController(IProjectService projects)
    {
        _projects = projects;
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(sub!);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _projects.GetAllAsync(GetUserId());
        return Ok(projects);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var project = await _projects.GetByIdAsync(id, GetUserId());
            if (project is null) return NotFound();
            return Ok(project);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

  [HttpPost]
    [Authorize(Roles = "Organizer,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
    {
        try
        {
            var project = await _projects.CreateAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = project.Id }, project);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto)
    {
        try
        {
            var project = await _projects.UpdateAsync(id, dto, GetUserId());
            return Ok(project);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeProjectStatusDto dto)
    {
        try
        {
            var dummyUpdate = new UpdateProjectDto
            {
                Status = dto.Status,
                // Інші поля візьмемо з існуючого проєкту
            };

            var existing = await _projects.GetByIdAsync(id, GetUserId());
            if (existing == null) return NotFound();

            dummyUpdate.Title = existing.Title;
            dummyUpdate.Description = existing.Description;
            dummyUpdate.Category = existing.Category;
            dummyUpdate.Priority = existing.Priority;
            dummyUpdate.Color = existing.Color;
            dummyUpdate.StartDate = existing.StartDate;
            dummyUpdate.Deadline = existing.Deadline;
            dummyUpdate.Goal = existing.Goal;
            dummyUpdate.Tags = existing.Tags;

            var project = await _projects.UpdateAsync(id, dummyUpdate, GetUserId());
            return Ok(project);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _projects.DeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}