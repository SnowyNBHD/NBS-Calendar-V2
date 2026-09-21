"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/actions/auth";

function parseVisibility(value: FormDataEntryValue | null) {
  return value === "private" ? "private" : value === "shared" ? "shared" : null;
}

export async function createNote(formData: FormData) {
  const { supabase } = await requireUser();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const title = String(formData.get("title") ?? "").trim();
  const visibility = parseVisibility(formData.get("visibility")) ?? "shared";

  await supabase.from("notes").insert({ author: "user", kind: "note", title, body, visibility });

  revalidatePath("/notes");
}

export async function updateNote(id: string, formData: FormData) {
  const { supabase } = await requireUser();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const title = String(formData.get("title") ?? "").trim();

  const update: Record<string, unknown> = { title, body, updated_at: new Date().toISOString() };
  const visibility = parseVisibility(formData.get("visibility"));
  if (visibility) update.visibility = visibility;

  await supabase.from("notes").update(update).eq("id", id);

  revalidatePath(`/notes/${id}`);
  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  const { supabase } = await requireUser();

  await supabase.from("notes").delete().eq("id", id);

  revalidatePath("/notes");
  redirect("/notes");
}

export async function answerQuestion(id: string, formData: FormData) {
  const { supabase } = await requireUser();

  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer) return;
  const now = new Date().toISOString();

  await supabase
    .from("notes")
    .update({ answer, answered_at: now, updated_at: now })
    .eq("id", id)
    .eq("kind", "question")
    .is("resolved_at", null);

  revalidatePath("/notes");
}
