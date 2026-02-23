CREATE TABLE "landing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_id" text NOT NULL,
	"session_id" text,
	"event_type" text NOT NULL,
	"page" text NOT NULL,
	"path" text NOT NULL,
	"cta_id" text,
	"referrer_host" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "landing_events_created_at_idx" ON "landing_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "landing_events_event_type_idx" ON "landing_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "landing_events_page_idx" ON "landing_events" USING btree ("page");--> statement-breakpoint
CREATE INDEX "landing_events_anonymous_id_idx" ON "landing_events" USING btree ("anonymous_id");
