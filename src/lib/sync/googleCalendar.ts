import { createAdminClient } from "@/lib/supabase/admin";
import { listGoogleCalendarEvents } from "@/lib/google/calendar";
import { getPersonalCalendarAccessToken } from "@/lib/google/personalSource";
import { localDateToUtc } from "@/lib/timezone";

// Pulls events from the personal Google Calendar into our `events` table.
// Read-only sync: MVP only needs the personal calendar mirrored locally so
// the Today view and brain-dump triage can see it. Runs on-demand for now
// (a "Sync now" button); can move to a scheduled job later without changing
// this function.
export async function syncGooglePersonalCalendar() {
  const admin = createAdminClient();
  const { accessToken, sourceId } = await getPersonalCalendarAccessToken();

  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const googleEvents = await listGoogleCalendarEvents(accessToken, {
    timeMin,
    timeMax,
  });

  const rows = googleEvents
    .filter((e) => e.status !== "cancelled" && (e.start?.dateTime || e.start?.date))
    .map((e) => ({
      title: e.summary ?? "(no title)",
      start_time:
        e.start!.dateTime ?? localDateToUtc(e.start!.date!).toISOString(),
      end_time: e.end?.dateTime
        ? e.end.dateTime
        : e.end?.date
          ? localDateToUtc(e.end.date).toISOString()
          : null,
      location: e.location ?? null,
      source: "google_personal",
      external_id: e.id,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length) {
    await admin
      .from("events")
      .upsert(rows, { onConflict: "source,external_id" });
  }

  await admin
    .from("calendar_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", sourceId);

  return rows.length;
}
