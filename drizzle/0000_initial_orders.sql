CREATE TYPE "public"."package_status" AS ENUM('pending', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"customer" text NOT NULL,
	"total_units" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_len" CHECK (length(btrim("orders"."number")) BETWEEN 1 AND 30),
	CONSTRAINT "orders_customer_len" CHECK (length(btrim("orders"."customer")) BETWEEN 1 AND 100),
	CONSTRAINT "orders_total_units_range" CHECK ("orders"."total_units" BETWEEN 1 AND 100000)
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"units" integer NOT NULL,
	"status" "package_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_units_range" CHECK ("packages"."units" BETWEEN 1 AND 100),
	CONSTRAINT "packages_sequence_positive" CHECK ("packages"."sequence" >= 1)
);
--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_unique_ci" ON "orders" USING btree (lower(btrim("number")));--> statement-breakpoint
CREATE UNIQUE INDEX "packages_order_sequence_unique" ON "packages" USING btree ("order_id","sequence");--> statement-breakpoint
CREATE INDEX "packages_order_id_idx" ON "packages" USING btree ("order_id");