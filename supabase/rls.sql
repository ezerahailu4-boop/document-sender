-- Row-level security for the app tables. The Next.js API routes use the
-- Supabase service-role key (via Prisma's direct Postgres connection) for
-- all writes, so RLS here is a defense-in-depth layer against any future
-- direct client access via the Supabase JS client / PostgREST.

alter table departments enable row level security;
alter table users enable row level security;
alter table documents enable row level security;
alter table document_routes enable row level security;
alter table route_actions enable row level security;
alter table audit_events enable row level security;
alter table notifications enable row level security;
alter table reference_sequences enable row level security;

-- Service role bypasses RLS by default in Supabase, so no explicit
-- service-role policies are required. Add narrower authenticated-role
-- policies here only if you plan to query these tables directly from the
-- browser via the Supabase client (not the current architecture, which
-- routes all reads/writes through Next.js server code).
