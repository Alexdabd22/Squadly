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
            // Users columns
            migrationBuilder.Sql(@"ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""GlobalRole"" character varying(20) NOT NULL DEFAULT 'User';");

            // TaskItem columns
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""PointsAwarded"" boolean NOT NULL DEFAULT false;");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""ReviewClaimedAt"" timestamp with time zone;");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""ReviewClaimedByUserId"" uuid;");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""ReviewComment"" character varying(2000);");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" ADD COLUMN IF NOT EXISTS ""ReviewedByUserId"" uuid;");

            // Projects columns
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""Category"" character varying(30) NOT NULL DEFAULT 'Other';");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""Color"" character varying(20) NOT NULL DEFAULT 'indigo';");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""Goal"" character varying(1000);");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""Priority"" character varying(20) NOT NULL DEFAULT 'Medium';");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""StartDate"" timestamp with time zone;");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" ADD COLUMN IF NOT EXISTS ""Tags"" jsonb NOT NULL DEFAULT '[]'::jsonb;");

            // TaskSubmissions table
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""TaskSubmissions"" (
                    ""Id"" uuid NOT NULL,
                    ""TaskItemId"" uuid NOT NULL,
                    ""SubmittedByUserId"" uuid NOT NULL,
                    ""WhatWasDone"" character varying(3000) NOT NULL,
                    ""Links"" jsonb NOT NULL DEFAULT '[]'::jsonb,
                    ""HoursSpent"" numeric(6,2),
                    ""SubmissionNumber"" integer NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone,
                    ""IsDeleted"" boolean NOT NULL,
                    CONSTRAINT ""PK_TaskSubmissions"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TaskSubmissions_TaskItem_TaskItemId"" FOREIGN KEY (""TaskItemId"") REFERENCES ""TaskItem"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TaskSubmissions_Users_SubmittedByUserId"" FOREIGN KEY (""SubmittedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            // Indexes
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskItem_ReviewClaimedByUserId"" ON ""TaskItem"" (""ReviewClaimedByUserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskItem_ReviewedByUserId"" ON ""TaskItem"" (""ReviewedByUserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskSubmissions_SubmittedByUserId"" ON ""TaskSubmissions"" (""SubmittedByUserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TaskSubmissions_TaskItemId"" ON ""TaskSubmissions"" (""TaskItemId"");");

            // Foreign keys (conditional)
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_TaskItem_Users_ReviewClaimedByUserId'
                    ) THEN
                        ALTER TABLE ""TaskItem"" ADD CONSTRAINT ""FK_TaskItem_Users_ReviewClaimedByUserId""
                            FOREIGN KEY (""ReviewClaimedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL;
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_TaskItem_Users_ReviewedByUserId'
                    ) THEN
                        ALTER TABLE ""TaskItem"" ADD CONSTRAINT ""FK_TaskItem_Users_ReviewedByUserId""
                            FOREIGN KEY (""ReviewedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_TaskItem_Users_ReviewClaimedByUserId') THEN
                        ALTER TABLE ""TaskItem"" DROP CONSTRAINT ""FK_TaskItem_Users_ReviewClaimedByUserId"";
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_TaskItem_Users_ReviewedByUserId') THEN
                        ALTER TABLE ""TaskItem"" DROP CONSTRAINT ""FK_TaskItem_Users_ReviewedByUserId"";
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TaskSubmissions"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_TaskItem_ReviewClaimedByUserId"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_TaskItem_ReviewedByUserId"";");

            migrationBuilder.Sql(@"ALTER TABLE ""Users"" DROP COLUMN IF EXISTS ""GlobalRole"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""PointsAwarded"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""ReviewClaimedAt"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""ReviewClaimedByUserId"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""ReviewComment"";");
            migrationBuilder.Sql(@"ALTER TABLE ""TaskItem"" DROP COLUMN IF EXISTS ""ReviewedByUserId"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""Category"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""Color"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""Goal"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""Priority"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""StartDate"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Projects"" DROP COLUMN IF EXISTS ""Tags"";");
        }
    }
}
