import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Server-only — never import
// this from a Client Component or anything that ships to the browser.
// Used for writes to calendar_sources (refresh tokens / feed URLs) and for
// the MCP server routes, which authenticate the caller themselves rather
// than relying on a browser session.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
