"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/actions/auth";

export async function createProject(formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select("id")
    .single();
  if (error || !data) return;

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const description = String(formData.get("description") ?? "");

  await supabase
    .from("projects")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  const { supabase } = await requireUser();

  await supabase.from("projects").delete().eq("id", id);

  revalidatePath("/projects");
}

export async function addProjectItem(projectId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await supabase.from("project_items").insert({ project_id: projectId, content });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function setProjectItemDone(
  projectId: string,
  itemId: string,
  isDone: boolean,
) {
  const { supabase } = await requireUser();

  await supabase
    .from("project_items")
    .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
    .eq("id", itemId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function deleteProjectItem(projectId: string, itemId: string) {
  const { supabase } = await requireUser();

  await supabase.from("project_items").delete().eq("id", itemId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
