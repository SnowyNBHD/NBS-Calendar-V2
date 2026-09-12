"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/actions/auth";
import { syncGooglePersonalCalendar } from "@/lib/sync/googleCalendar";
import { syncAllIcsFeeds } from "@/lib/sync/icsFeeds";

export async function syncCalendarNow() {
  await requireUser();
  // ICS sync no-ops on any feed that isn't configured yet, so this stays a
  // single "sync everything" button regardless of how many sources exist.
  await Promise.all([syncGooglePersonalCalendar(), syncAllIcsFeeds()]);
  revalidatePath("/today");
  revalidatePath("/events");
}
