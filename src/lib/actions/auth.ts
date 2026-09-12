import { createClient } from "@/lib/supabase/server";

// Server Functions are reachable via direct POST requests, not just through
// the app's UI (see Next.js data-security guide), so every action re-checks
// auth even though proxy.ts already gates page navigation and RLS already
// gates the query itself. Belt and suspenders, cheap to call.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}
