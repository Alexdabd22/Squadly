using NUnit.Framework;
using Squadly.Domain.Entities;

namespace Squadly.Tests;

/// <summary>
/// Юніт-тести для сутності User.
/// Перевіряють коректність роботи з полями і обчислювальною властивістю FullName.
/// Ці тести виконуються у CI pipeline на етапі "test".
/// </summary>
[TestFixture]
public class UserTests
{
    [Test]
    public void User_FullName_CombinesFirstAndLastName()
    {
        var user = new User
        {
            FirstName = "Олександр",
            LastName = "Пастухов",
            Email = "pastukhov@example.com"
        };

        Assert.That(user.FullName, Is.EqualTo("Олександр Пастухов"));
    }

    [Test]
    public void User_FullName_TrimsWhenLastNameIsEmpty()
    {
        var user = new User
        {
            FirstName = "Олександр",
            LastName = string.Empty
        };

        Assert.That(user.FullName, Is.EqualTo("Олександр"));
    }

    [Test]
    public void User_NewInstance_HasDefaultEmptyStrings()
    {
        var user = new User();

        Assert.Multiple(() =>
        {
            Assert.That(user.FirstName, Is.EqualTo(string.Empty));
            Assert.That(user.LastName, Is.EqualTo(string.Empty));
            Assert.That(user.Email, Is.EqualTo(string.Empty));
            Assert.That(user.PasswordHash, Is.EqualTo(string.Empty));
        });
    }

    [Test]
    public void User_NewInstance_HasGeneratedGuidId()
    {
        var user1 = new User();
        var user2 = new User();

        Assert.Multiple(() =>
        {
            Assert.That(user1.Id, Is.Not.EqualTo(Guid.Empty));
            Assert.That(user2.Id, Is.Not.EqualTo(Guid.Empty));
            Assert.That(user1.Id, Is.Not.EqualTo(user2.Id));
        });
    }

    [Test]
    public void User_NewInstance_HasEmptyCollections()
    {
        var user = new User();

        Assert.Multiple(() =>
        {
            Assert.That(user.ProjectMemberships, Is.Not.Null);
            Assert.That(user.ProjectMemberships, Is.Empty);
            Assert.That(user.TeamMemberships, Is.Not.Null);
            Assert.That(user.AssignedTasks, Is.Not.Null);
            Assert.That(user.Comments, Is.Not.Null);
        });
    }
}
