CREATE TABLE "documentation_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"piece_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"start_timestamp" integer,
	"end_timestamp" integer,
	"refinement_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "mode" text DEFAULT 'idea-to-spec' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "video_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "documentation_pieces" ADD CONSTRAINT "documentation_pieces_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;