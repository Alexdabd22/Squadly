using NUnit.Framework;
using Squadly.Domain.Entities;

namespace Squadly.Tests;

/// <summary>
/// Юніт-тести для сутності Project.
/// Перевіряють коректність створення проекту і значення за замовчуванням.
/// </summary>
[TestFixture]
public class ProjectTests
{
    [Test]
    public void Project_NewInstance_HasActiveStatusByDefault()
    {
        var project = new Project
        {
            Title = "Squadly Diploma"
        };

        Assert.That(project.Status, Is.EqualTo(ProjectStatus.Active));
    }

    [Test]
    public void Project_NewInstance_HasEmptyCollections()
    {
        var project = new Project();

        Assert.Multiple(() =>
        {
            Assert.That(project.Memberships, Is.Not.Null.And.Empty);
            Assert.That(project.Teams, Is.Not.Null.And.Empty);
            Assert.That(project.Tasks, Is.Not.Null.And.Empty);
        });
    }

    [Test]
    public void Project_CanChangeStatusToCompleted()
    {
        // Arrange — створюємо активний проект
        var project = new Project { Title = "Test" };

        project.Status = ProjectStatus.Completed;

        Assert.That(project.Status, Is.EqualTo(ProjectStatus.Completed));
    }

    [TestCase(ProjectStatus.Active, 0)]
    [TestCase(ProjectStatus.Completed, 1)]
    [TestCase(ProjectStatus.Archived, 2)]
    public void ProjectStatus_HasCorrectNumericValues(ProjectStatus status, int expectedValue)
    {
        Assert.That((int)status, Is.EqualTo(expectedValue));
    }

    [Test]
    public void Project_IsNotDeleted_ByDefault()
    {
        // Arrange + Act — новий проект
        var project = new Project();

        Assert.That(project.IsDeleted, Is.False);
    }
}
