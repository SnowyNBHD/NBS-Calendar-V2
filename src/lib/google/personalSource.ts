import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleAccessToken } from "@/lib/google/tokens";

// Shared by both the read-sync job and the write actions (create/delete
// event) — both need a fresh access token for the personal Google account.
export async function getPersonalCalendarAccessToken() {
  const admin = createAdminClient();

  const { data: source, error } = await admin
    .from("calendar_sources")
    .select("id, oauth_refresh_token")
    .eq("provider", "google_oauth")
    .eq("account_label", "personal")
    .single();

  if (error || !source?.oauth_refresh_token) {
    throw new Error("No personal Google Calendar connection found");
  }

  const accessToken = await getGoogleAccessToken(source.oauth_refresh_token);
  return { accessToken, sourceId: source.id as string };
}
