"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/actions/auth";
import { localDateTimeToUtc } from "@/lib/timezone";

export async function createTask(formData: FormData) {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const dueDate = formData.get("due_date");
  const priority = formData.get("priority");

  await supabase.from("tasks").insert({
    title,
    due_date: dueDate ? localDateTimeToUtc(String(dueDate)).toISOString() : null,
    priority: priority ? String(priority) : null,
  });

  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function setTaskStatus(id: string, status: "active" | "done") {
  const { supabase } = await requireUser();

  await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function deleteTask(id: string) {
  const { supabase } = await requireUser();

  await supabase.from("tasks").delete().eq("id", id);

  revalidatePath("/tasks");
  revalidatePath("/today");
}
