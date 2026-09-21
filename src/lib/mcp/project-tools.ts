import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResult, textResult } from "@/lib/mcp/results";

type ItemRow = {
  id: string;
  content: string;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
};

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

// Every project with its full to-do and done lists. Uncapped on purpose: the
// data is small and single-user, and Claude is meant to read all of it.
export async function fetchProjectsWithItems(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("projects")
    .select("id, name, description, project_items(id, content, is_done, done_at, created_at)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((project) => {
    const items = (project.project_items ?? []) as ItemRow[];
    return {
      id: project.id as string,
      name: project.name as string,
      description: project.description as string,
      to_do: items
        .filter((i) => !i.is_done)
        .sort((a, b) => time(a.created_at) - time(b.created_at))
        .map((i) => ({ id: i.id, content: i.content })),
      done: items
        .filter((i) => i.is_done)
        .sort((a, b) => time(b.done_at) - time(a.done_at))
        .map((i) => ({ id: i.id, content: i.content, done_at: i.done_at })),
    };
  });
}

export function registerProjectTools(server: McpServer) {
  const admin = createAdminClient();

  server.registerTool(
    "create_project",
    {
      description:
        "Create a project with an optional description and optional starting to-do items.",
      inputSchema: z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(10_000).optional(),
        items: z.array(z.string().min(1).max(500)).max(100).optional(),
      }),
    },
    async ({ name, description, items }) => {
      try {
        const { data, error } = await admin
          .from("projects")
          .insert({ name, description: description ?? "" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        if (items?.length) {
          const { error: itemsError } = await admin
            .from("project_items")
            .insert(items.map((content) => ({ project_id: data.id, content })));
          if (itemsError) throw new Error(itemsError.message);
        }

        return textResult(
          `Created project "${name}" (id: ${data.id}) with ${items?.length ?? 0} to-do item(s).`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "update_project",
    {
      description: "Change a project's name and/or description.",
      inputSchema: z.object({
        id: z.string(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(10_000).optional(),
      }),
    },
    async ({ id, name, description }) => {
      try {
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) update.name = name;
        if (description !== undefined) update.description = description;

        const { data, error } = await admin
          .from("projects")
          .update(update)
          .eq("id", id)
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error(`No project with id ${id}`);

        return textResult(`Updated project ${id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "add_project_items",
    {
      description:
        "Add items to a project's to-do list, or set done to true to log them as already done.",
      inputSchema: z.object({
        project_id: z.string(),
        items: z.array(z.string().min(1).max(500)).min(1).max(100),
        done: z.boolean().optional(),
      }),
    },
    async ({ project_id, items, done }) => {
      try {
        const now = new Date().toISOString();
        const { error } = await admin.from("project_items").insert(
          items.map((content) => ({
            project_id,
            content,
            is_done: done ?? false,
            done_at: done ? now : null,
          })),
        );
        if (error) throw new Error(error.message);

        return textResult(
          `Added ${items.length} ${done ? "done" : "to-do"} item(s) to project ${project_id}.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "update_project_item",
    {
      description: "Edit a project item's text and/or mark it done or not done.",
      inputSchema: z.object({
        id: z.string(),
        content: z.string().min(1).max(500).optional(),
        is_done: z.boolean().optional(),
      }),
    },
    async ({ id, content, is_done }) => {
      try {
        const update: Record<string, unknown> = {};
        if (content !== undefined) update.content = content;
        if (is_done !== undefined) {
          update.is_done = is_done;
          update.done_at = is_done ? new Date().toISOString() : null;
        }
        if (!Object.keys(update).length) {
          throw new Error("Nothing to update: provide content and/or is_done.");
        }

        const { data, error } = await admin
          .from("project_items")
          .update(update)
          .eq("id", id)
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error(`No project item with id ${id}`);

        return textResult(`Updated project item ${id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
