import ical, { type VEvent } from "node-ical";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateToUtc } from "@/lib/timezone";

function toDateStr(d: Date) {
  // Uses the server's local getters, which is fine here because node-ical
  // itself constructed this Date from an all-day VALUE=DATE using local
  // components — we're just reading back what it wrote, then handing the
  // resulting Y-M-D off to localDateToUtc for a timezone-correct instant.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function syncOneFeed(source: { id: string; account_label: string; feed_url: string }) {
  const admin = createAdminClient();

  const res = await fetch(source.feed_url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS feed "${source.account_label}": ${res.status}`);
  }

  const text = await res.text();
  const parsed = ical.sync.parseICS(text);

  const rows = Object.values(parsed)
    .filter((entry): entry is VEvent => entry?.type === "VEVENT" && !!entry.start)
    .map((event) => {
      const isAllDay = event.start.dateOnly === true;
      const startTime = isAllDay
        ? localDateToUtc(toDateStr(event.start)).toISOString()
        : event.start.toISOString();

      return {
        title: typeof event.summary === "string" ? event.summary : "(untitled)",
        start_time: startTime,
        end_time: null,
        location: null,
        source: `ics_${source.account_label}`,
        external_id: event.uid,
        synced_at: new Date().toISOString(),
      };
    });

  if (rows.length) {
    await admin.from("events").upsert(rows, { onConflict: "source,external_id" });
  }

  await admin
    .from("calendar_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", source.id);

  return rows.length;
}

// Pulls every configured ICS feed (Canvas, a school Google account's
// Classroom-derived calendar export, Apple Calendar later, etc). Read-only —
// none of these are writable from here. Generic by design: adding a new
// feed is just a row in calendar_sources, no code change needed.
export async function syncAllIcsFeeds() {
  const admin = createAdminClient();

  const { data: sources } = await admin
    .from("calendar_sources")
    .select("id, account_label, feed_url")
    .eq("provider", "ics_feed");

  const feeds = (sources ?? []).filter(
    (s): s is { id: string; account_label: string; feed_url: string } => !!s.feed_url,
  );

  let total = 0;
  for (const feed of feeds) {
    total += await syncOneFeed(feed);
  }
  return total;
}
