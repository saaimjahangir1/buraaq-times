// Database lock-down for Supabase (run once, and again after `npx prisma db push`
// adds a new table):   node scripts/secure-database.mjs
//
// Supabase publishes every table in the "public" schema through its own web API
// (PostgREST), reachable with the project's anon key. This website never uses
// that API — it talks to Postgres directly through Prisma — so here we:
//   1. switch on Row Level Security for every table, with no policies: the
//      Supabase API (anon / authenticated roles) can't read or change any row;
//   2. remove the anon / authenticated roles' access to the tables, also for
//      tables created later.
// The website connects as the tables' owner, which RLS doesn't apply to, so it
// keeps working. Tables owned by a different role are skipped and listed.
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env.mjs";

loadEnv();
const prisma = new PrismaClient();

const lockDown = `
DO $$
DECLARE
  r record;
  me text := current_user;
  bypass boolean;
  api_role text;
BEGIN
  SELECT (rolbypassrls OR rolsuper) INTO bypass FROM pg_roles WHERE rolname = current_user;

  -- Tables (and their id sequences) the website owns: RLS on, Supabase API roles out.
  -- Anything owned by another role is left alone (listed afterwards).
  FOR r IN
    SELECT c.relname, c.relkind, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S')
      AND (pg_get_userbyid(c.relowner) = me OR bypass)
  LOOP
    IF r.relkind IN ('r', 'p') AND NOT r.relrowsecurity THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    END IF;
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON %s public.%I FROM %I', CASE WHEN r.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, r.relname, api_role);
      END IF;
    END LOOP;
  END LOOP;

  -- Tables the website creates later (npx prisma db push) aren't handed to the API roles either.
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END $$;`;

try {
  await prisma.$executeRawUnsafe(lockDown);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS table, c.relrowsecurity AS rls, pg_get_userbyid(c.relowner) AS owner, current_user AS me
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname`);
  let off = 0;
  for (const r of rows) {
    if (!r.rls) off++;
    console.log(`${r.rls ? "  RLS on " : "  RLS OFF"}  ${r.table}${r.rls ? "" : `  (owned by ${r.owner}; the site connects as ${r.me} — not changed)`}`);
  }
  console.log(off ? `\nDone, but ${off} table(s) were skipped — send this output for a look.` : `\nDone: all ${rows.length} tables are locked to the website only.`);
} catch (e) {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
