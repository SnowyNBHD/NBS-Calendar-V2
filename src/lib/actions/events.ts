"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPersonalCalendarAccessToken } from "@/lib/google/personalSource";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar";
import { localDateTimeToUtc } from "@/lib/timezone";

export async function createEvent(formData: FormData) {
  await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const startTimeRaw = String(formData.get("start_time") ?? "");
  const location = formData.get("location");
  if (!title || !startTimeRaw) return;

  const startTime = localDateTimeToUtc(startTimeRaw).toISOString();

  // Write-through: create on Google Calendar first (source of truth), then
  // mirror it locally so it shows up immediately without a manual sync.
  const { accessToken } = await getPersonalCalendarAccessToken();
  const googleEvent = await createGoogleCalendarEvent(accessToken, {
    title,
    startTime,
    location: location ? String(location) : null,
  });

  const admin = createAdminClient();
  await admin.from("events").insert({
    title,
    start_time: startTime,
    end_time: googleEvent.end?.dateTime ?? null,
    location: location ? String(location) : null,
    source: "google_personal",
    external_id: googleEvent.id,
    synced_at: new Date().toISOString(),
  });

  revalidatePath("/events");
  revalidatePath("/today");
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireUser();

  const { data: event } = await supabase
    .from("events")
    .select("external_id, source")
    .eq("id", id)
    .single();

  if (event?.source === "google_personal" && event.external_id) {
    const { accessToken } = await getPersonalCalendarAccessToken();
    await deleteGoogleCalendarEvent(accessToken, event.external_id);
  }

  await supabase.from("events").delete().eq("id", id);

  revalidatePath("/events");
  revalidatePath("/today");
}
