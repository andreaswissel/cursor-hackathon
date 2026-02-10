CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Untitled Project' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: create an "Untitled Project" for each user who has sessions
INSERT INTO "projects" ("id", "user_id", "name", "created_at", "updated_at")
SELECT gen_random_uuid(), s."user_id", 'Untitled Project', now(), now()
FROM "sessions" s
WHERE s."user_id" IS NOT NULL
GROUP BY s."user_id";--> statement-breakpoint
-- Backfill: assign existing sessions to their user's Untitled Project
UPDATE "sessions" s
SET "project_id" = p."id"
FROM "projects" p
WHERE p."user_id" = s."user_id" AND p."name" = 'Untitled Project';