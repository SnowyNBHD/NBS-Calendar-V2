"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPersonalCalendarAccessToken } from "@/lib/google/personalSource";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";
import { localDateTimeToUtc } from "@/lib/timezone";

export async function captureBrainDump(formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await supabase
    .from("brain_dump_inbox")
    .insert({ raw_content: content, source: "typed" });

  revalidatePath("/inbox");
  revalidatePath("/today");
}

export async function triageToTask(itemId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await supabase.from("tasks").insert({ title: content });
  await supabase
    .from("brain_dump_inbox")
    .update({ status: "triaged" })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/tasks");
}

export async function triageToListItem(itemId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  const listId = String(formData.get("list_id") ?? "");
  if (!content || !listId) return;

  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  await supabase
    .from("list_items")
    .insert({ list_id: listId, content, sort_order: count ?? 0 });
  await supabase
    .from("brain_dump_inbox")
    .update({ status: "triaged" })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/lists");
}

export async function triageToEvent(itemId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  const startTimeRaw = String(formData.get("start_time") ?? "");
  if (!content || !startTimeRaw) return;

  const startTime = localDateTimeToUtc(startTimeRaw).toISOString();

  const { accessToken } = await getPersonalCalendarAccessToken();
  const googleEvent = await createGoogleCalendarEvent(accessToken, {
    title: content,
    startTime,
  });

  const admin = createAdminClient();
  await admin.from("events").insert({
    title: content,
    start_time: startTime,
    end_time: googleEvent.end?.dateTime ?? null,
    source: "google_personal",
    external_id: googleEvent.id,
    synced_at: new Date().toISOString(),
  });

  await supabase
    .from("brain_dump_inbox")
    .update({ status: "triaged" })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/events");
}

export async function discardInboxItem(itemId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("brain_dump_inbox")
    .update({ status: "triaged" })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/today");
}
