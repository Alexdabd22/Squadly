using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Squadly.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop FK if it exists
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_TaskItem_Teams_TeamId'
                        AND table_name = 'TaskItem'
                    ) THEN
                        ALTER TABLE ""TaskItem"" DROP CONSTRAINT ""FK_TaskItem_Teams_TeamId"";
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TeamMemberships"" CASCADE;");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TeamMessages"" CASCADE;");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Teams"" CASCADE;");

            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_TaskItem_TeamId"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""TeamId"";");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""MentorNotes"" (
                    ""Id"" uuid NOT NULL,
                    ""MentorUserId"" uuid NOT NULL,
                    ""AboutUserId"" uuid NOT NULL,
                    ""ProjectId"" uuid NOT NULL,
                    ""Content"" character varying(2000) NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone,
                    ""IsDeleted"" boolean NOT NULL,
                    CONSTRAINT ""PK_MentorNotes"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_MentorNotes_Projects_ProjectId"" FOREIGN KEY (""ProjectId"") REFERENCES ""Projects"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_MentorNotes_Users_AboutUserId"" FOREIGN KEY (""AboutUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT,
                    CONSTRAINT ""FK_MentorNotes_Users_MentorUserId"" FOREIGN KEY (""MentorUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MentorNotes_AboutUserId"" ON ""MentorNotes"" (""AboutUserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MentorNotes_MentorUserId_AboutUserId_ProjectId"" ON ""MentorNotes"" (""MentorUserId"", ""AboutUserId"", ""ProjectId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MentorNotes_MentorUserId_ProjectId"" ON ""MentorNotes"" (""MentorUserId"", ""ProjectId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MentorNotes_ProjectId"" ON ""MentorNotes"" (""ProjectId"");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""MentorNotes"";");

            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""TeamId"" uuid;");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Teams"" (
                    ""Id"" uuid NOT NULL,
                    ""ProjectId"" uuid NOT NULL,
                    ""TeamLeadUserId"" uuid,
                    ""Name"" character varying(200) NOT NULL,
                    ""Description"" character varying(1000),
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone,
                    ""IsDeleted"" boolean NOT NULL,
                    CONSTRAINT ""PK_Teams"" PRIMARY KEY (""Id"")
                );
            ");
        }
    }
}
