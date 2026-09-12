"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/actions/auth";

export async function createList(formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("lists").insert({ name });

  revalidatePath("/lists");
}

export async function deleteList(id: string) {
  const { supabase } = await requireUser();

  await supabase.from("lists").delete().eq("id", id);

  revalidatePath("/lists");
}

export async function addListItem(listId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  await supabase.from("list_items").insert({
    list_id: listId,
    content,
    sort_order: count ?? 0,
  });

  revalidatePath(`/lists/${listId}`);
}

export async function toggleListItem(
  listId: string,
  itemId: string,
  isChecked: boolean,
) {
  const { supabase } = await requireUser();

  await supabase
    .from("list_items")
    .update({ is_checked: isChecked })
    .eq("id", itemId);

  revalidatePath(`/lists/${listId}`);
}

export async function deleteListItem(listId: string, itemId: string) {
  const { supabase } = await requireUser();

  await supabase.from("list_items").delete().eq("id", itemId);

  revalidatePath(`/lists/${listId}`);
}
