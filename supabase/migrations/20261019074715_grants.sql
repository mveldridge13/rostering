-- Permissions for the `app` schema. Hand-written: Drizzle does not manage grants.
--
-- `app_user` is the role the API switches to for every request
-- (`set local role app_user`, see packages/db/src/client.ts). It cannot log
-- in and is always subject to row-level security.

-- Let the connection user (postgres) switch into app_user.
GRANT app_user TO postgres;--> statement-breakpoint

GRANT USAGE ON SCHEMA app TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_user;--> statement-breakpoint

-- The audit log is append-only: history of who worked with children must not be editable.
REVOKE UPDATE, DELETE, TRUNCATE ON app.audit_log FROM app_user;--> statement-breakpoint

-- Organisations are created and removed by the platform, never by a tenant.
REVOKE INSERT, DELETE, TRUNCATE ON app.organisations FROM app_user;--> statement-breakpoint

-- Supabase's Data API roles have no access to this schema at all.
REVOKE ALL ON SCHEMA app FROM anon, authenticated, public;
