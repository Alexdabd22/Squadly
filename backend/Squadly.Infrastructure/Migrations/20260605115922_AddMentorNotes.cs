using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Squadly.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentorNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tables may already exist — use IF NOT EXISTS to be safe
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ProjectMessages"" (
                    ""Id"" uuid NOT NULL,
                    ""ProjectId"" uuid NOT NULL,
                    ""AuthorUserId"" uuid NOT NULL,
                    ""Content"" character varying(2000) NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone,
                    ""IsDeleted"" boolean NOT NULL,
                    CONSTRAINT ""PK_ProjectMessages"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_ProjectMessages_Projects_ProjectId"" FOREIGN KEY (""ProjectId"") REFERENCES ""Projects"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_ProjectMessages_Users_AuthorUserId"" FOREIGN KEY (""AuthorUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ProjectMessages_AuthorUserId"" ON ""ProjectMessages"" (""AuthorUserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ProjectMessages_ProjectId"" ON ""ProjectMessages"" (""ProjectId"");");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""TaskAttachments"" (
                    ""Id"" uuid NOT NULL,
                    ""TaskItemId"" uuid NOT NULL,
                    ""UploadedByUserId"" uuid NOT NULL,
                    ""FileName"" character varying(255) NOT NULL,
                    ""OriginalFileName"" character varying(255) NOT NULL,
                    ""ContentType"" character varying(100) NOT NULL,
                    ""FileSize"" bigint NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone,
                    ""IsDeleted"" boolean NOT NULL,
                    CONSTRAINT ""PK_TaskAttachments"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TaskAttachments_TaskItem_TaskItemId"" FOREIGN KEY (""TaskItemId"") REFERENCES ""TaskItem"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TaskAttachments_Users_UploadedByUserId"" FOREIGN KEY (""UploadedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskAttachments_TaskItemId"" ON ""TaskAttachments"" (""TaskItemId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskAttachments_UploadedByUserId"" ON ""TaskAttachments"" (""UploadedByUserId"");");

            // TeamMessages is only created if Teams exists; RemoveTeams migration handles cleanup
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Teams') THEN
                        CREATE TABLE IF NOT EXISTS ""TeamMessages"" (
                            ""Id"" uuid NOT NULL,
                            ""TeamId"" uuid NOT NULL,
                            ""AuthorUserId"" uuid NOT NULL,
                            ""Content"" character varying(2000) NOT NULL,
                            ""CreatedAt"" timestamp with time zone NOT NULL,
                            ""UpdatedAt"" timestamp with time zone,
                            ""IsDeleted"" boolean NOT NULL,
                            CONSTRAINT ""PK_TeamMessages"" PRIMARY KEY (""Id""),
                            CONSTRAINT ""FK_TeamMessages_Teams_TeamId"" FOREIGN KEY (""TeamId"") REFERENCES ""Teams"" (""Id"") ON DELETE CASCADE,
                            CONSTRAINT ""FK_TeamMessages_Users_AuthorUserId"" FOREIGN KEY (""AuthorUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                        );
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TeamMessages') THEN
                        CREATE INDEX IF NOT EXISTS ""IX_TeamMessages_AuthorUserId"" ON ""TeamMessages"" (""AuthorUserId"");
                        CREATE INDEX IF NOT EXISTS ""IX_TeamMessages_TeamId"" ON ""TeamMessages"" (""TeamId"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""ProjectMessages"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TaskAttachments"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TeamMessages"";");
        }
    }
}
