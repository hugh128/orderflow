CREATE TABLE "package_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" uuid NOT NULL,
	"from_status" "package_status" NOT NULL,
	"to_status" "package_status" NOT NULL,
	"kind" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_events_transition" CHECK ((
    "package_events"."kind" = 'advance' AND "package_events"."reason" IS NULL AND (
      ("package_events"."from_status" = 'pending' AND "package_events"."to_status" = 'in_progress') OR
      ("package_events"."from_status" = 'in_progress' AND "package_events"."to_status" = 'review') OR
      ("package_events"."from_status" = 'review' AND "package_events"."to_status" = 'done')
    )
  ) OR (
    "package_events"."kind" = 'reject' AND "package_events"."from_status" = 'review' AND "package_events"."to_status" = 'in_progress'
    AND "package_events"."reason" IS NOT NULL AND length(btrim("package_events"."reason")) BETWEEN 1 AND 300
  ))
);
--> statement-breakpoint
ALTER TABLE "package_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "package_events_package_id_idx" ON "package_events" USING btree ("package_id","id");