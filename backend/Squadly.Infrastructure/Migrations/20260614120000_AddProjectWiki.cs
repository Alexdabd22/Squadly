using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Squadly.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectWiki : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WikiContent",
                table: "Projects",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WikiContent",
                table: "Projects");
        }
    }
}
