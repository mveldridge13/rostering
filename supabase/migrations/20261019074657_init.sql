CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."age_group" AS ENUM('0-24m', '24-36m', '36m-preschool', 'school-age');--> statement-breakpoint
CREATE TYPE "app"."australian_state" AS ENUM('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT');--> statement-breakpoint
CREATE TYPE "app"."booking_status" AS ENUM('booked', 'absent');--> statement-breakpoint
CREATE TYPE "app"."credential_type" AS ENUM('WWCC', 'First Aid', 'CPR', 'Anaphylaxis', 'Asthma', 'Child Protection');--> statement-breakpoint
CREATE TYPE "app"."employment_type" AS ENUM('Full-time', 'Part-time', 'Casual');--> statement-breakpoint
CREATE TYPE "app"."leave_status" AS ENUM('requested', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "app"."leave_type" AS ENUM('Annual', 'Personal', 'Study', 'Unavailable');--> statement-breakpoint
CREATE TYPE "app"."room_theme" AS ENUM('nursery', 'toddler', 'preschool', 'kindy');--> statement-breakpoint
CREATE TYPE "app"."shift_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "app"."shift_tag" AS ENUM('Opener', 'Closer', 'Responsible Person', 'Float');--> statement-breakpoint
CREATE TYPE "app"."staff_role" AS ENUM('Centre Director', 'Early Childhood Teacher', 'Diploma Educator', 'Certificate III Educator', 'Working Towards', 'Cook');--> statement-breakpoint
CREATE TYPE "app"."work_type" AS ENUM('care', 'office', 'kitchen');--> statement-breakpoint
CREATE ROLE "app_user";--> statement-breakpoint
CREATE TABLE "app"."audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"centre_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	"status" "app"."booking_status" DEFAULT 'booked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_times_check" CHECK ("app"."bookings"."start_minute" >= 0 and "app"."bookings"."end_minute" <= 1440 and "app"."bookings"."end_minute" > "app"."bookings"."start_minute")
);
--> statement-breakpoint
ALTER TABLE "app"."bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."centres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"service_approval_number" text NOT NULL,
	"state" "app"."australian_state" NOT NULL,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"opens_at" smallint NOT NULL,
	"closes_at" smallint NOT NULL,
	"weekly_wage_budget_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "centres_org_id_key" UNIQUE("org_id","id"),
	CONSTRAINT "centres_hours_check" CHECK ("app"."centres"."opens_at" >= 0 and "app"."centres"."closes_at" <= 1440 and "app"."centres"."closes_at" > "app"."centres"."opens_at")
);
--> statement-breakpoint
ALTER TABLE "app"."centres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"centre_id" uuid NOT NULL,
	"external_ref" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"room_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "children_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."children" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"type" "app"."credential_type" NOT NULL,
	"reference" text,
	"expires_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."leave" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"type" "app"."leave_type" NOT NULL,
	"status" "app"."leave_status" DEFAULT 'requested' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_dates_check" CHECK ("app"."leave"."end_date" >= "app"."leave"."start_date")
);
--> statement-breakpoint
ALTER TABLE "app"."leave" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."organisations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"centre_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age_group" "app"."age_group" NOT NULL,
	"children_per_educator" smallint NOT NULL,
	"licensed_places" smallint NOT NULL,
	"theme" "app"."room_theme" NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_org_id_key" UNIQUE("org_id","id"),
	CONSTRAINT "rooms_ratio_check" CHECK ("app"."rooms"."children_per_educator" > 0),
	CONSTRAINT "rooms_places_check" CHECK ("app"."rooms"."licensed_places" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"centre_id" uuid NOT NULL,
	"staff_id" uuid,
	"work_type" "app"."work_type" DEFAULT 'care' NOT NULL,
	"room_id" uuid,
	"date" date NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	"break_minutes" smallint DEFAULT 0 NOT NULL,
	"tags" "app"."shift_tag"[] DEFAULT '{}' NOT NULL,
	"status" "app"."shift_status" DEFAULT 'draft' NOT NULL,
	"open_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_times_check" CHECK ("app"."shifts"."start_minute" >= 0 and "app"."shifts"."end_minute" <= 1440 and "app"."shifts"."end_minute" > "app"."shifts"."start_minute"),
	CONSTRAINT "shifts_break_check" CHECK ("app"."shifts"."break_minutes" >= 0 and "app"."shifts"."break_minutes" < "app"."shifts"."end_minute" - "app"."shifts"."start_minute"),
	CONSTRAINT "shifts_room_check" CHECK (("app"."shifts"."work_type" = 'care') = ("app"."shifts"."room_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"centre_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "app"."staff_role" NOT NULL,
	"employment" "app"."employment_type" NOT NULL,
	"primary_room_id" uuid,
	"contract_hours" numeric(4, 1) DEFAULT 0 NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"counts_in_ratio" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_org_id_key" UNIQUE("org_id","id"),
	CONSTRAINT "staff_contract_hours_check" CHECK ("app"."staff"."contract_hours" >= 0),
	CONSTRAINT "staff_rate_check" CHECK ("app"."staff"."hourly_rate_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."audit_log" ADD CONSTRAINT "audit_log_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_centre_fk" FOREIGN KEY ("org_id","centre_id") REFERENCES "app"."centres"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_child_fk" FOREIGN KEY ("org_id","child_id") REFERENCES "app"."children"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_room_fk" FOREIGN KEY ("org_id","room_id") REFERENCES "app"."rooms"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."centres" ADD CONSTRAINT "centres_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."children" ADD CONSTRAINT "children_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."children" ADD CONSTRAINT "children_centre_fk" FOREIGN KEY ("org_id","centre_id") REFERENCES "app"."centres"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."children" ADD CONSTRAINT "children_room_fk" FOREIGN KEY ("org_id","room_id") REFERENCES "app"."rooms"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."credentials" ADD CONSTRAINT "credentials_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."credentials" ADD CONSTRAINT "credentials_staff_fk" FOREIGN KEY ("org_id","staff_id") REFERENCES "app"."staff"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leave" ADD CONSTRAINT "leave_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leave" ADD CONSTRAINT "leave_staff_fk" FOREIGN KEY ("org_id","staff_id") REFERENCES "app"."staff"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."rooms" ADD CONSTRAINT "rooms_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."rooms" ADD CONSTRAINT "rooms_centre_fk" FOREIGN KEY ("org_id","centre_id") REFERENCES "app"."centres"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."shifts" ADD CONSTRAINT "shifts_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."shifts" ADD CONSTRAINT "shifts_centre_fk" FOREIGN KEY ("org_id","centre_id") REFERENCES "app"."centres"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."shifts" ADD CONSTRAINT "shifts_staff_fk" FOREIGN KEY ("org_id","staff_id") REFERENCES "app"."staff"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."shifts" ADD CONSTRAINT "shifts_room_fk" FOREIGN KEY ("org_id","room_id") REFERENCES "app"."rooms"("org_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff" ADD CONSTRAINT "staff_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff" ADD CONSTRAINT "staff_centre_fk" FOREIGN KEY ("org_id","centre_id") REFERENCES "app"."centres"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff" ADD CONSTRAINT "staff_primary_room_fk" FOREIGN KEY ("org_id","primary_room_id") REFERENCES "app"."rooms"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "app"."audit_log" USING btree ("org_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_child_date_key" ON "app"."bookings" USING btree ("child_id","date");--> statement-breakpoint
CREATE INDEX "bookings_room_date_idx" ON "app"."bookings" USING btree ("room_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "centres_service_approval_number_key" ON "app"."centres" USING btree ("service_approval_number");--> statement-breakpoint
CREATE UNIQUE INDEX "children_external_ref_key" ON "app"."children" USING btree ("centre_id","external_ref");--> statement-breakpoint
CREATE INDEX "children_room_idx" ON "app"."children" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_staff_type_key" ON "app"."credentials" USING btree ("staff_id","type");--> statement-breakpoint
CREATE INDEX "credentials_expiry_idx" ON "app"."credentials" USING btree ("org_id","expires_on");--> statement-breakpoint
CREATE INDEX "leave_staff_dates_idx" ON "app"."leave" USING btree ("staff_id","start_date");--> statement-breakpoint
CREATE INDEX "rooms_centre_idx" ON "app"."rooms" USING btree ("centre_id");--> statement-breakpoint
CREATE INDEX "shifts_centre_date_idx" ON "app"."shifts" USING btree ("centre_id","date");--> statement-breakpoint
CREATE INDEX "shifts_staff_date_idx" ON "app"."shifts" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "staff_centre_idx" ON "app"."staff" USING btree ("centre_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."audit_log" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."audit_log"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."audit_log"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."bookings" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."bookings"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."bookings"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."centres" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."centres"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."centres"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."children" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."children"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."children"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."credentials" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."credentials"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."credentials"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."leave" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."leave"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."leave"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."organisations" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."organisations"."id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."organisations"."id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."rooms" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."rooms"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."rooms"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."shifts" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."shifts"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."shifts"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "app"."staff" AS PERMISSIVE FOR ALL TO "app_user" USING ("app"."staff"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK ("app"."staff"."org_id" = nullif(current_setting('app.org_id', true), '')::uuid);