import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPersonalCalendarAccessToken } from "@/lib/google/personalSource";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";
import { APP_TIMEZONE, localDayRange } from "@/lib/timezone";
import { errorResult, textResult } from "@/lib/mcp/results";
import { fetchProjectsWithItems, registerProjectTools } from "@/lib/mcp/project-tools";

export function registerTools(server: McpServer) {
  const admin = createAdminClient();

  registerProjectTools(server);

  server.registerTool(
    "get_context",
    {
      description:
        "Get current situational awareness: active tasks, upcoming events (next 14 days), " +
        "active lists, projects (description, to-do items and done items), and unsorted " +
        "brain-dump items. Call this before organizing anything so you know what already exists.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { start: todayStart } = localDayRange();
        const horizon = new Date(todayStart);
        horizon.setDate(horizon.getDate() + 14);

        const [{ data: tasks }, { data: events }, { data: lists }, { data: inbox }, projects] =
          await Promise.all([
            admin
              .from("tasks")
              .select("id, title, notes, status, priority, due_date, list_id, event_id")
              .eq("status", "active")
              .order("due_date", { ascending: true, nullsFirst: false }),
            admin
              .from("events")
              .select("id, title, start_time, end_time, location, source")
              .gte("start_time", todayStart.toISOString())
              .lt("start_time", horizon.toISOString())
              .order("start_time", { ascending: true }),
            admin
              .from("lists")
              .select("id, name, type, list_items(count)")
              .order("name"),
            admin
              .from("brain_dump_inbox")
              .select("id, raw_content, created_at")
              .eq("status", "unprocessed")
              .order("created_at", { ascending: true }),
            fetchProjectsWithItems(admin),
          ]);

        return textResult(
          JSON.stringify(
            {
              now: new Date().toISOString(),
              timezone: APP_TIMEZONE,
              tasks,
              upcoming_events: events,
              lists: lists?.map((l) => ({
                id: l.id,
                name: l.name,
                type: l.type,
                item_count: l.list_items?.[0]?.count ?? 0,
              })),
              projects,
              unsorted_brain_dump: inbox,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a new task.",
      inputSchema: z.object({
        title: z.string(),
        notes: z.string().optional(),
        due_date: z
          .string()
          .optional()
          .describe("ISO 8601 datetime with timezone offset or Z, e.g. 2026-09-15T14:00:00-07:00"),
        priority: z.enum(["low", "medium", "high"]).optional(),
        list_id: z.string().optional(),
        event_id: z.string().optional(),
      }),
    },
    async ({ title, notes, due_date, priority, list_id, event_id }) => {
      try {
        const { data, error } = await admin
          .from("tasks")
          .insert({
            title,
            notes: notes ?? null,
            due_date: due_date ? new Date(due_date).toISOString() : null,
            priority: priority ?? null,
            list_id: list_id ?? null,
            event_id: event_id ?? null,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        return textResult(`Created task "${title}" (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update fields on an existing task (status, due date, priority, etc).",
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "done", "deferred"]).optional(),
        due_date: z.string().nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).nullable().optional(),
      }),
    },
    async ({ id, title, notes, status, due_date, priority }) => {
      try {
        const update: Record<string, unknown> = {};
        if (title !== undefined) update.title = title;
        if (notes !== undefined) update.notes = notes;
        if (status !== undefined) {
          update.status = status;
          update.completed_at = status === "done" ? new Date().toISOString() : null;
        }
        if (due_date !== undefined) {
          update.due_date = due_date ? new Date(due_date).toISOString() : null;
        }
        if (priority !== undefined) update.priority = priority;

        const { error } = await admin.from("tasks").update(update).eq("id", id);
        if (error) throw new Error(error.message);
        return textResult(`Updated task ${id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "create_event",
    {
      description:
        "Create an event on the personal Google Calendar. Writes through to Google " +
        "immediately, not just local storage.",
      inputSchema: z.object({
        title: z.string(),
        start_time: z
          .string()
          .describe("ISO 8601 datetime with timezone offset or Z"),
        end_time: z.string().optional().describe("ISO 8601 datetime; defaults to start + 1 hour"),
        location: z.string().optional(),
      }),
    },
    async ({ title, start_time, end_time, location }) => {
      try {
        const startTime = new Date(start_time).toISOString();
        const endTime = end_time ? new Date(end_time).toISOString() : null;

        const { accessToken } = await getPersonalCalendarAccessToken();
        const googleEvent = await createGoogleCalendarEvent(accessToken, {
          title,
          startTime,
          endTime,
          location: location ?? null,
        });

        const { error } = await admin.from("events").insert({
          title,
          start_time: startTime,
          end_time: googleEvent.end?.dateTime ?? endTime,
          location: location ?? null,
          source: "google_personal",
          external_id: googleEvent.id,
          synced_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);

        return textResult(`Created event "${title}" at ${startTime} on Google Calendar.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "create_list",
    {
      description: "Create a new list (freeform or checklist).",
      inputSchema: z.object({
        name: z.string(),
        type: z.enum(["freeform", "checklist"]).optional(),
      }),
    },
    async ({ name, type }) => {
      try {
        const { data, error } = await admin
          .from("lists")
          .insert({ name, type: type ?? "freeform" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return textResult(`Created list "${name}" (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "add_list_item",
    {
      description: "Add an item to an existing list.",
      inputSchema: z.object({
        list_id: z.string(),
        content: z.string(),
      }),
    },
    async ({ list_id, content }) => {
      try {
        const { count } = await admin
          .from("list_items")
          .select("id", { count: "exact", head: true })
          .eq("list_id", list_id);

        const { error } = await admin
          .from("list_items")
          .insert({ list_id, content, sort_order: count ?? 0 });
        if (error) throw new Error(error.message);

        return textResult(`Added "${content}" to list ${list_id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "log_brain_dump",
    {
      description:
        "Store raw unstructured input (typed, transcribed voice, or a description of a " +
        "photo) in the brain-dump inbox. Use this to queue something for later review, or " +
        "call it and then immediately use the other tools in the same turn to sort it.",
      inputSchema: z.object({
        content: z.string(),
        source: z.enum(["typed", "voice", "photo"]).optional(),
      }),
    },
    async ({ content, source }) => {
      try {
        const { data, error } = await admin
          .from("brain_dump_inbox")
          .insert({ raw_content: content, source: source ?? "typed" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return textResult(`Logged brain dump (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
