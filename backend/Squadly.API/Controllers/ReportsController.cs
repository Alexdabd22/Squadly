using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Squadly.Application.Interfaces;
using Squadly.Infrastructure.Persistence;
using System.Security.Claims;

namespace Squadly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAuthorizationService _auth;

    public ReportsController(AppDbContext db, IProjectAuthorizationService auth)
    {
        _db = db;
        _auth = auth;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    [HttpGet("project/{projectId}/pdf")]
    public async Task<IActionResult> ProjectPdf(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);
        if (project == null) return NotFound();

        if (!await _auth.IsMemberAsync(projectId, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var tasks = await _db.Tasks
            .Where(t => t.ProjectId == projectId)
            .Include(t => t.Assignee)
            .OrderBy(t => t.Status)
            .ThenByDescending(t => t.Priority)
            .ToListAsync();

        var total = tasks.Count;
        var done = tasks.Count(t => t.Status == "Done");
        var inProgress = tasks.Count(t => t.Status == "InProgress");
        var todo = tasks.Count(t => t.Status == "ToDo");
        var completionRate = total > 0 ? (done * 100.0 / total) : 0;

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Helvetica"));

                page.Header().Column(col =>
                {
                    col.Item().Text("Звіт по проєкту").FontSize(20).Bold().FontColor(Colors.Indigo.Darken2);
                    col.Item().Text(project.Title).FontSize(16).SemiBold();
                    if (!string.IsNullOrEmpty(project.Description))
                        col.Item().Text(project.Description).FontSize(10).FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text($"Згенеровано: {DateTime.Now:dd.MM.yyyy HH:mm}")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                });

                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Item().PaddingBottom(10).Text("Загальна статистика").FontSize(14).Bold();

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(8).Column(c =>
                        {
                            c.Item().Text("Усього задач").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(total.ToString()).FontSize(16).Bold();
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Green.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("Виконано").FontSize(9).FontColor(Colors.Green.Darken2);
                            c.Item().Text(done.ToString()).FontSize(16).Bold().FontColor(Colors.Green.Darken2);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Blue.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("В роботі").FontSize(9).FontColor(Colors.Blue.Darken2);
                            c.Item().Text(inProgress.ToString()).FontSize(16).Bold().FontColor(Colors.Blue.Darken2);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(8).Column(c =>
                        {
                            c.Item().Text("До виконання").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(todo.ToString()).FontSize(16).Bold();
                        });
                    });

                    col.Item().PaddingTop(10).Text($"Прогрес виконання: {completionRate:F1}%").FontSize(11).Bold();
                    col.Item().PaddingTop(20).Text("Перелік задач").FontSize(14).Bold();

                    col.Item().PaddingTop(5).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Назва").FontColor(Colors.White).Bold();
                            header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Статус").FontColor(Colors.White).Bold();
                            header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Пріоритет").FontColor(Colors.White).Bold();
                            header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Виконавець").FontColor(Colors.White).Bold();
                        });

                        var statusLabels = new Dictionary<string, string>
                        {
                            { "ToDo", "До виконання" },
                            { "InProgress", "В роботі" },
                            { "Done", "Виконано" }
                        };

                        var priorityLabels = new Dictionary<string, string>
                        {
                            { "Low", "Низький" },
                            { "Medium", "Середній" },
                            { "High", "Високий" }
                        };

                        foreach (var task in tasks)
                        {
                            table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(task.Title).FontSize(10);
                            table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                .Text(statusLabels.GetValueOrDefault(task.Status, task.Status)).FontSize(10);
                            table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                .Text(priorityLabels.GetValueOrDefault(task.Priority, task.Priority)).FontSize(10);
                            table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                .Text(task.Assignee != null ? $"{task.Assignee.FirstName} {task.Assignee.LastName}" : "—").FontSize(10);
                        }
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Squadly • Сторінка ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontSize(9);
                    text.Span(" з ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontSize(9);
                });
            });
        }).GeneratePdf();

        var fileName = $"project_{project.Title.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    [HttpGet("project/{projectId}/excel")]
    public async Task<IActionResult> ProjectExcel(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);
        if (project == null) return NotFound();

        if (!await _auth.IsMemberAsync(projectId, userId.Value))
            return StatusCode(403, new { message = "Ви не є учасником цього проєкту" });

        var tasks = await _db.Tasks
            .Where(t => t.ProjectId == projectId)
            .Include(t => t.Assignee)
            .OrderBy(t => t.Status)
            .ToListAsync();

        using var package = new ExcelPackage();
        var sheet = package.Workbook.Worksheets.Add("Задачі");

        sheet.Cells[1, 1].Value = "Назва";
        sheet.Cells[1, 2].Value = "Опис";
        sheet.Cells[1, 3].Value = "Статус";
        sheet.Cells[1, 4].Value = "Пріоритет";
        sheet.Cells[1, 5].Value = "Виконавець";
        sheet.Cells[1, 6].Value = "Створено";

        using (var range = sheet.Cells[1, 1, 1, 6])
        {
            range.Style.Font.Bold = true;
            range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(79, 70, 229));
            range.Style.Font.Color.SetColor(System.Drawing.Color.White);
        }

        var statusLabels = new Dictionary<string, string>
        {
            { "ToDo", "До виконання" },
            { "InProgress", "В роботі" },
            { "Done", "Виконано" }
        };

        var priorityLabels = new Dictionary<string, string>
        {
            { "Low", "Низький" },
            { "Medium", "Середній" },
            { "High", "Високий" }
        };

        int row = 2;
        foreach (var task in tasks)
        {
            sheet.Cells[row, 1].Value = task.Title;
            sheet.Cells[row, 2].Value = task.Description ?? "";
            sheet.Cells[row, 3].Value = statusLabels.GetValueOrDefault(task.Status, task.Status);
            sheet.Cells[row, 4].Value = priorityLabels.GetValueOrDefault(task.Priority, task.Priority);
            sheet.Cells[row, 5].Value = task.Assignee != null ? $"{task.Assignee.FirstName} {task.Assignee.LastName}" : "—";
            sheet.Cells[row, 6].Value = task.CreatedAt.ToString("dd.MM.yyyy HH:mm");
            row++;
        }

        sheet.Cells[sheet.Dimension.Address].AutoFitColumns();

        var bytes = package.GetAsByteArray();
        var fileName = $"project_{project.Title.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("user/me/pdf")]
    public async Task<IActionResult> MyReportPdf()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user == null) return NotFound();

        var assignedTasks = await _db.Tasks
            .Where(t => t.AssigneeUserId == userId.Value)
            .Include(t => t.Project)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var completed = assignedTasks.Count(t => t.Status == "Done");
        var inProgress = assignedTasks.Count(t => t.Status == "InProgress");

        var ratings = await _db.Ratings.Where(r => r.UserId == userId.Value).ToListAsync();
        var totalPoints = ratings.Sum(r => r.Points);

        var commentsCount = await _db.Comments.CountAsync(c => c.AuthorUserId == userId.Value);

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Helvetica"));

                page.Header().Column(col =>
                {
                    col.Item().Text("Особистий звіт").FontSize(20).Bold().FontColor(Colors.Indigo.Darken2);
                    col.Item().Text($"{user.FirstName} {user.LastName}").FontSize(16).SemiBold();
                    col.Item().Text(user.Email).FontSize(10).FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text($"Згенеровано: {DateTime.Now:dd.MM.yyyy HH:mm}")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                });

                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Item().PaddingBottom(10).Text("Моя активність").FontSize(14).Bold();

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Background(Colors.Indigo.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Балів рейтингу").FontSize(9).FontColor(Colors.Indigo.Darken2);
                            c.Item().Text(totalPoints.ToString()).FontSize(20).Bold().FontColor(Colors.Indigo.Darken2);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Green.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Виконано задач").FontSize(9).FontColor(Colors.Green.Darken2);
                            c.Item().Text(completed.ToString()).FontSize(20).Bold().FontColor(Colors.Green.Darken2);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Blue.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("В роботі").FontSize(9).FontColor(Colors.Blue.Darken2);
                            c.Item().Text(inProgress.ToString()).FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Background(Colors.Purple.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Коментарів").FontSize(9).FontColor(Colors.Purple.Darken2);
                            c.Item().Text(commentsCount.ToString()).FontSize(20).Bold().FontColor(Colors.Purple.Darken2);
                        });
                    });

                    col.Item().PaddingTop(20).Text("Призначені задачі").FontSize(14).Bold();

                    if (assignedTasks.Count == 0)
                    {
                        col.Item().PaddingTop(10).Text("Поки немає призначених задач.").FontSize(10).FontColor(Colors.Grey.Medium);
                    }
                    else
                    {
                        col.Item().PaddingTop(5).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Назва").FontColor(Colors.White).Bold();
                                header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Проєкт").FontColor(Colors.White).Bold();
                                header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Статус").FontColor(Colors.White).Bold();
                                header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text("Пріоритет").FontColor(Colors.White).Bold();
                            });

                            var statusLabels = new Dictionary<string, string>
                            {
                                { "ToDo", "До виконання" },
                                { "InProgress", "В роботі" },
                                { "Done", "Виконано" }
                            };

                            var priorityLabels = new Dictionary<string, string>
                            {
                                { "Low", "Низький" },
                                { "Medium", "Середній" },
                                { "High", "Високий" }
                            };

                            foreach (var task in assignedTasks)
                            {
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(task.Title).FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(task.Project?.Title ?? "—").FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                    .Text(statusLabels.GetValueOrDefault(task.Status, task.Status)).FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                    .Text(priorityLabels.GetValueOrDefault(task.Priority, task.Priority)).FontSize(10);
                            }
                        });
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Squadly • Сторінка ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontSize(9);
                    text.Span(" з ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontSize(9);
                });
            });
        }).GeneratePdf();

        var fileName = $"my_report_{DateTime.Now:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }
}