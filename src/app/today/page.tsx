import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarNow } from "@/lib/actions/sync";
import { eventTime, localDayRange } from "@/lib/timezone";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";
import { Chip } from "../chip";

export default async function TodayPage() {
  const supabase = await createClient();

  const { start: startOfDay, end: endOfDay } = localDayRange();

  const [{ data: tasks }, { data: events }, { data: inbox }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, due_date")
      .eq("status", "active")
      .or(`due_date.is.null,due_date.lte.${endOfDay.toISOString()}`)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("events")
      .select("id, title, start_time, location")
      .gte("start_time", startOfDay.toISOString())
      .lt("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("brain_dump_inbox")
      .select("id, raw_content")
      .eq("status", "unprocessed")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <Frame>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl text-ink">Today</h1>
        <form action={syncCalendarNow}>
          <button type="submit" className="btn text-sm">
            Sync calendar
          </button>
        </form>
      </div>

      <div className="today-grid">
      <div className="area-events">
      <Panel title="events" count={events?.length ? String(events.length).padStart(2, "0") : "00"}>
        {events?.length ? (
          events.map((e) => (
            <div className="row" key={e.id}>
              <span className="nums meta w-20 shrink-0">
                {eventTime(new Date(e.start_time)).label}
              </span>
              <span className="title">{e.title}</span>
              {e.location ? <span className="meta">{e.location}</span> : null}
            </div>
          ))
        ) : (
          <PanelEmpty>nothing scheduled</PanelEmpty>
        )}
      </Panel>
      </div>

      <div className="area-tasks">
      <Panel title="tasks" count={tasks?.length ? String(tasks.length).padStart(2, "0") + " open" : "00"}>
        {tasks?.length ? (
          tasks.map((t) => (
            <div className="row" key={t.id}>
              <span className="title">{t.title}</span>
              {t.priority === "high" ? <Chip tone="high">high</Chip> : null}
              {t.priority === "low" ? <Chip tone="low">low</Chip> : null}
              {t.priority === "medium" ? <Chip>medium</Chip> : null}
            </div>
          ))
        ) : (
          <PanelEmpty>nothing due</PanelEmpty>
        )}
      </Panel>
      </div>

      {inbox?.length ? (
        <div className="area-unsorted">
        <Panel title="unsorted" count={`${inbox.length} new`}>
          {inbox.map((i) => (
            <div className="row" key={i.id}>
              <span className="title truncate text-ink-muted">{i.raw_content}</span>
            </div>
          ))}
          <div className="row justify-end border-t border-panel-line">
            <Link href="/inbox" className="text-oxblood-bright hover:underline">
              triage inbox
            </Link>
          </div>
        </Panel>
        </div>
      ) : null}
      </div>
    </Frame>
  );
}
