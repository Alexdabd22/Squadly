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

    // ─────────── helper-структура для статистики учасника ───────────
    private class MemberStats
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = "";
        public int Assigned { get; set; }
        public int Done { get; set; }
        public decimal HoursSpent { get; set; }
        public int Revisions { get; set; }    
        public int Points { get; set; }
        public decimal AvgHours => Done > 0 ? Math.Round(HoursSpent / Done, 1) : 0;
    }

    private async Task<List<MemberStats>> BuildMemberStats(Guid projectId)
    {
        var memberships = await _db.ProjectMemberships
            .Where(pm => pm.ProjectId == projectId)
            .Include(pm => pm.User)
            .ToListAsync();

        var taskIds = await _db.Tasks
            .Where(t => t.ProjectId == projectId)
            .Select(t => t.Id)
            .ToListAsync();

        var allSubs = await _db.TaskSubmissions
            .Where(s => taskIds.Contains(s.TaskItemId))
            .ToListAsync();

        var result = new List<MemberStats>();
        foreach (var m in memberships)
        {
            if (m.User == null) continue;

            var userTasks = await _db.Tasks
                .Where(t => t.ProjectId == projectId && t.AssigneeUserId == m.UserId)
                .ToListAsync();

            var userTaskIds = userTasks.Select(t => t.Id).ToList();
            var userSubs = allSubs.Where(s => userTaskIds.Contains(s.TaskItemId)).ToList();
            var hours = userSubs.Where(s => s.HoursSpent.HasValue).Sum(s => s.HoursSpent!.Value);

            var revisions = userTaskIds
                .Select(tid => userSubs.Where(s => s.TaskItemId == tid).Select(s => s.SubmissionNumber).DefaultIfEmpty(0).Max() - 1)
                .Where(n => n > 0)
                .Sum();

            var points = await _db.Ratings
                .Where(r => r.UserId == m.UserId)
                .SumAsync(r => (int?)r.Points) ?? 0;

            result.Add(new MemberStats
            {
                UserId = m.UserId,
                FullName = $"{m.User.FirstName} {m.User.LastName}",
                Assigned = userTasks.Count,
                Done = userTasks.Count(t => t.Status == "Done"),
                HoursSpent = hours,
                Revisions = revisions,
                Points = points,
            });
        }
        return result.OrderByDescending(x => x.Done).ThenByDescending(x => x.HoursSpent).ToList();
    }

    // ─────────── PROJECT PDF ───────────
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

        var memberStats = await BuildMemberStats(projectId);

        var total = tasks.Count;
        var done = tasks.Count(t => t.Status == "Done");
        var inProgress = tasks.Count(t => t.Status == "InProgress");
        var todo = tasks.Count(t => t.Status == "ToDo");
        var inReview = tasks.Count(t => t.Status == "InReview");
        var completionRate = total > 0 ? (done * 100.0 / total) : 0;

        var totalHours = memberStats.Sum(m => m.HoursSpent);
        var totalRevisions = memberStats.Sum(m => m.Revisions);

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
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Green.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("Виконано").FontSize(9).FontColor(Colors.Green.Darken2);
                            c.Item().Text(done.ToString()).FontSize(16).Bold().FontColor(Colors.Green.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Blue.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("В роботі").FontSize(9).FontColor(Colors.Blue.Darken2);
                            c.Item().Text(inProgress.ToString()).FontSize(16).Bold().FontColor(Colors.Blue.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Purple.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("На перевірці").FontSize(9).FontColor(Colors.Purple.Darken2);
                            c.Item().Text(inReview.ToString()).FontSize(16).Bold().FontColor(Colors.Purple.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(8).Column(c =>
                        {
                            c.Item().Text("До виконання").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(todo.ToString()).FontSize(16).Bold();
                        });
                    });

                    col.Item().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem().Text($"Прогрес виконання: {completionRate:F1}%").FontSize(11).Bold();
                        row.RelativeItem().AlignRight().Text($"Загальний час: {totalHours:F1} год · Доопрацювань: {totalRevisions}")
                            .FontSize(10).FontColor(Colors.Grey.Darken2);
                    });

                    // ─── Внесок учасників ───
                    col.Item().PaddingTop(20).Text("Внесок учасників").FontSize(14).Bold();
                    col.Item().PaddingTop(2).Text("Витрачений час включає час з усіх здач, кількість доопрацювань — скільки разів задачі повертали на переробку")
                        .FontSize(9).FontColor(Colors.Grey.Medium);

                    if (memberStats.Count == 0)
                    {
                        col.Item().PaddingTop(8).Text("Учасників ще немає").FontSize(10).FontColor(Colors.Grey.Medium);
                    }
                    else
                    {
                        col.Item().PaddingTop(8).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(4f);
                                columns.RelativeColumn(1f);
                                columns.RelativeColumn(1f);
                                columns.RelativeColumn(1.2f);
                                columns.RelativeColumn(1.3f);
                                columns.RelativeColumn(1.3f);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "Учасник", "Призначено", "Виконано", "Час (год)", "Середній час", "Доопрацювань" })
                                {
                                    header.Cell().Background(Colors.Indigo.Darken2).Padding(5).Text(h).FontColor(Colors.White).Bold().FontSize(8);
                                }
                            });

                            foreach (var s in memberStats)
                            {
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(s.FullName).FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(s.Assigned.ToString()).FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text(s.Done.ToString()).FontSize(10).FontColor(Colors.Green.Darken2);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text($"{s.HoursSpent:F1}").FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5).Text($"{s.AvgHours:F1}").FontSize(10);
                                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5)
                                    .Text(s.Revisions == 0 ? "0" : s.Revisions.ToString())
                                    .FontSize(10).FontColor(s.Revisions > 0 ? Colors.Orange.Darken2 : Colors.Grey.Darken2);
                            }
                        });
                    }

                    col.Item().PaddingTop(20).Text("Перелік задач").FontSize(14).Bold();
                    col.Item().PaddingTop(5).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3.5f);
                            columns.RelativeColumn(2f);
                            columns.RelativeColumn(1.5f);
                            columns.RelativeColumn(2.5f);
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
                            { "InReview", "На перевірці" },
                            { "NeedsRevision", "Доопрацювання" },
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

    // ─────────── PROJECT EXCEL ───────────
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

        var memberStats = await BuildMemberStats(projectId);

        using var package = new ExcelPackage();

        // ─── Лист 1: Задачі ───
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
            { "InReview", "На перевірці" },
            { "NeedsRevision", "Доопрацювання" },
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
        if (sheet.Dimension != null) sheet.Cells[sheet.Dimension.Address].AutoFitColumns();

        // ─── Лист 2: Внесок учасників ───
        var sheet2 = package.Workbook.Worksheets.Add("Внесок учасників");
        sheet2.Cells[1, 1].Value = "Учасник";
        sheet2.Cells[1, 2].Value = "Призначено задач";
        sheet2.Cells[1, 3].Value = "Виконано";
        sheet2.Cells[1, 4].Value = "Витрачено годин";
        sheet2.Cells[1, 5].Value = "Середній час на задачу";
        sheet2.Cells[1, 6].Value = "Доопрацювань";

        using (var range = sheet2.Cells[1, 1, 1, 6])
        {
            range.Style.Font.Bold = true;
            range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(79, 70, 229));
            range.Style.Font.Color.SetColor(System.Drawing.Color.White);
        }

        int r = 2;
        foreach (var s in memberStats)
        {
            sheet2.Cells[r, 1].Value = s.FullName;
            sheet2.Cells[r, 2].Value = s.Assigned;
            sheet2.Cells[r, 3].Value = s.Done;
            sheet2.Cells[r, 4].Value = s.HoursSpent;
            sheet2.Cells[r, 5].Value = s.AvgHours;
            sheet2.Cells[r, 6].Value = s.Revisions;
            r++;
        }
        if (sheet2.Dimension != null) sheet2.Cells[sheet2.Dimension.Address].AutoFitColumns();

        var bytes = package.GetAsByteArray();
        var fileName = $"project_{project.Title.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // ─────────── PERSONAL PDF ───────────
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

        var taskIds = assignedTasks.Select(t => t.Id).ToList();
        var mySubs = await _db.TaskSubmissions
            .Where(s => taskIds.Contains(s.TaskItemId) && s.SubmittedByUserId == userId.Value)
            .ToListAsync();

        var totalHours = mySubs.Where(s => s.HoursSpent.HasValue).Sum(s => s.HoursSpent!.Value);
        var revisions = taskIds
            .Select(tid => mySubs.Where(s => s.TaskItemId == tid).Select(s => s.SubmissionNumber).DefaultIfEmpty(0).Max() - 1)
            .Where(n => n > 0).Sum();

        var completed = assignedTasks.Count(t => t.Status == "Done");
        var inProgress = assignedTasks.Count(t => t.Status == "InProgress");

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
                        row.RelativeItem().Background(Colors.Green.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Виконано задач").FontSize(9).FontColor(Colors.Green.Darken2);
                            c.Item().Text(completed.ToString()).FontSize(20).Bold().FontColor(Colors.Green.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Blue.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("В роботі").FontSize(9).FontColor(Colors.Blue.Darken2);
                            c.Item().Text(inProgress.ToString()).FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Purple.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Коментарів").FontSize(9).FontColor(Colors.Purple.Darken2);
                            c.Item().Text(commentsCount.ToString()).FontSize(20).Bold().FontColor(Colors.Purple.Darken2);
                        });
                    });
                    col.Item().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem().Background(Colors.Amber.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Витрачено годин").FontSize(9).FontColor(Colors.Amber.Darken3);
                            c.Item().Text($"{totalHours:F1}").FontSize(20).Bold().FontColor(Colors.Amber.Darken3);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Orange.Lighten4).Padding(10).Column(c =>
                        {
                            c.Item().Text("Доопрацювань").FontSize(9).FontColor(Colors.Orange.Darken2);
                            c.Item().Text(revisions.ToString()).FontSize(20).Bold().FontColor(Colors.Orange.Darken2);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(10).Column(c =>
                        {
                            c.Item().Text("Здач загалом").FontSize(9).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(mySubs.Count.ToString()).FontSize(20).Bold().FontColor(Colors.Grey.Darken3);
                        });
                        row.ConstantItem(8);
                        row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(10).Column(c =>
                        {
                            c.Item().Text("Середній час/задача").FontSize(9).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(completed > 0 ? $"{(totalHours / completed):F1} год" : "—")
                                .FontSize(20).Bold().FontColor(Colors.Grey.Darken3);
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
                                columns.RelativeColumn(3.5f);
                                columns.RelativeColumn(2.5f);
                                columns.RelativeColumn(2f);
                                columns.RelativeColumn(1.5f);
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
                                { "InReview", "На перевірці" },
                                { "NeedsRevision", "Доопрацювання" },
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