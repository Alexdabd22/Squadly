using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Squadly.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TaskReviewFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GlobalRole",
                table: "Users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "User");

            migrationBuilder.AddColumn<bool>(
                name: "PointsAwarded",
                table: "TaskItem",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewClaimedAt",
                table: "TaskItem",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewClaimedByUserId",
                table: "TaskItem",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewComment",
                table: "TaskItem",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedByUserId",
                table: "TaskItem",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Projects",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Projects",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "indigo");

            migrationBuilder.AddColumn<string>(
                name: "Goal",
                table: "Projects",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Projects",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "Projects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "Projects",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.CreateTable(
                name: "TaskSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    WhatWasDone = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    Links = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    HoursSpent = table.Column<decimal>(type: "numeric(6,2)", nullable: true),
                    SubmissionNumber = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskSubmissions_TaskItem_TaskItemId",
                        column: x => x.TaskItemId,
                        principalTable: "TaskItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskSubmissions_Users_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskItem_ReviewClaimedByUserId",
                table: "TaskItem",
                column: "ReviewClaimedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItem_ReviewedByUserId",
                table: "TaskItem",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskSubmissions_SubmittedByUserId",
                table: "TaskSubmissions",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskSubmissions_TaskItemId",
                table: "TaskSubmissions",
                column: "TaskItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItem_Users_ReviewClaimedByUserId",
                table: "TaskItem",
                column: "ReviewClaimedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItem_Users_ReviewedByUserId",
                table: "TaskItem",
                column: "ReviewedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskItem_Users_ReviewClaimedByUserId",
                table: "TaskItem");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskItem_Users_ReviewedByUserId",
                table: "TaskItem");

            migrationBuilder.DropTable(
                name: "TaskSubmissions");

            migrationBuilder.DropIndex(
                name: "IX_TaskItem_ReviewClaimedByUserId",
                table: "TaskItem");

            migrationBuilder.DropIndex(
                name: "IX_TaskItem_ReviewedByUserId",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "GlobalRole",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PointsAwarded",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "ReviewClaimedAt",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "ReviewClaimedByUserId",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "ReviewComment",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "ReviewedByUserId",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Goal",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "Projects");
        }
    }
}
