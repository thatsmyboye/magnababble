/**
 * Drop-in replacement for lib/supabase/service used when the dev server is
 * started with MAGNA_FAKE_DB=1 (see next.config.ts). Talks straight to the
 * Postgres named by MAGNA_TEST_DATABASE_URL through the test query builder,
 * so the UI can be exercised without a Supabase project.
 */
import { Pool } from "pg";
import { FakeSupabase } from "./fake-supabase";

let pool: Pool | null = null;

export function getServiceClient() {
  if (!process.env.MAGNA_TEST_DATABASE_URL) {
    throw new Error("MAGNA_TEST_DATABASE_URL is required with MAGNA_FAKE_DB");
  }
  pool ??= new Pool({ connectionString: process.env.MAGNA_TEST_DATABASE_URL });
  return new FakeSupabase(pool) as unknown as import("@supabase/supabase-js").SupabaseClient;
}

export type ServiceClient = import("@supabase/supabase-js").SupabaseClient;
