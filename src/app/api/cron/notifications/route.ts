import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push/send";
import { APP_TIMEZONE } from "@/lib/timezone";

const LEAD_TIME_MINUTES = 60;

// Called periodically by Supabase Cron (pg_cron + pg_net), not by a person
// or the browser — auth is a shared secret rather than a user session,
// same pattern as the MCP server's bearer check.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + LEAD_TIME_MINUTES * 60_000);

  const [{ data: events }, { data: tasks }] = await Promise.all([
    admin
      .from("events")
      .select("id, title, start_time, location")
      .is("notified_at", null)
      .gt("start_time", now.toISOString())
      .lte("start_time", horizon.toISOString()),
    admin
      .from("tasks")
      .select("id, title, due_date")
      .eq("status", "active")
      .is("notified_at", null)
      .gt("due_date", now.toISOString())
      .lte("due_date", horizon.toISOString()),
  ]);

  let notified = 0;

  for (const event of events ?? []) {
    const time = new Date(event.start_time).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: APP_TIMEZONE,
    });
    await sendPushToAll({
      title: `Starting soon: ${event.title}`,
      body: `${time}${event.location ? ` — ${event.location}` : ""}`,
      url: "/today",
    });
    await admin.from("events").update({ notified_at: now.toISOString() }).eq("id", event.id);
    notified++;
  }

  for (const task of tasks ?? []) {
    const time = new Date(task.due_date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: APP_TIMEZONE,
    });
    await sendPushToAll({
      title: `Due soon: ${task.title}`,
      body: `Due ${time}`,
      url: "/tasks",
    });
    await admin.from("tasks").update({ notified_at: now.toISOString() }).eq("id", task.id);
    notified++;
  }

  return Response.json({ notified });
}
