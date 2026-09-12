import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE, dateKeyInZone, localDateToUtc, todayKey } from "@/lib/timezone";
import Frame from "../frame";
import {
  addDaysToKey,
  addMonths,
  formatMonthKey,
  formatMonthLabel,
  formatWeekLabel,
  parseDateKey,
  parseMonthKey,
  startOfWeekKey,
} from "./date-utils";
import MonthGrid from "./month-grid";
import WeekAgenda from "./week-agenda";
import type { CalendarEntry } from "./types";

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const params = await props.searchParams;
  const view = params.view === "week" ? "week" : "month";
  const today = todayKey();
  const { year: todayYear, month: todayMonth } = parseDateKey(today);
  const currentMonthKey = formatMonthKey(todayYear, todayMonth);
  const currentWeekStart = startOfWeekKey(today);

  const supabase = await createClient();

  if (view === "week") {
    const weekStart = typeof params.week === "string" ? params.week : currentWeekStart;
    const weekEnd = addDaysToKey(weekStart, 7);

    const [{ data: events }, { data: tasks }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, start_time, location")
        .gte("start_time", localDateToUtc(weekStart).toISOString())
        .lt("start_time", localDateToUtc(weekEnd).toISOString()),
      supabase
        .from("tasks")
        .select("id, title, due_date, priority")
        .eq("status", "active")
        .gte("due_date", localDateToUtc(weekStart).toISOString())
        .lt("due_date", localDateToUtc(weekEnd).toISOString()),
    ]);

    const byDay = groupEntries(events ?? [], tasks ?? []);

    return (
      <Frame wide>
        <CalendarHeader view="week" label={formatWeekLabel(weekStart)} currentMonthKey={currentMonthKey} currentWeekStart={currentWeekStart} />
        <div className="mb-4 flex justify-center gap-4">
          <a className="btn" href={`/calendar?view=week&week=${addDaysToKey(weekStart, -7)}`}>
            ← prev
          </a>
          <a className="btn" href={`/calendar?view=week&week=${currentWeekStart}`}>
            today
          </a>
          <a className="btn" href={`/calendar?view=week&week=${addDaysToKey(weekStart, 7)}`}>
            next →
          </a>
        </div>
        <WeekAgenda weekStart={weekStart} byDay={byDay} today={today} />
      </Frame>
    );
  }

  const monthKey = typeof params.month === "string" ? params.month : currentMonthKey;
  const { year, month } = parseMonthKey(monthKey);
  const monthStartKey = `${monthKey}-01`;
  const nextMonth = addMonths(year, month, 1);
  const nextMonthStartKey = `${formatMonthKey(nextMonth.year, nextMonth.month)}-01`;
  const prevMonth = addMonths(year, month, -1);

  const [{ data: events }, { data: tasks }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, start_time, location")
      .gte("start_time", localDateToUtc(monthStartKey).toISOString())
      .lt("start_time", localDateToUtc(nextMonthStartKey).toISOString()),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority")
      .eq("status", "active")
      .gte("due_date", localDateToUtc(monthStartKey).toISOString())
      .lt("due_date", localDateToUtc(nextMonthStartKey).toISOString()),
  ]);

  const byDay = groupEntries(events ?? [], tasks ?? []);

  return (
    <Frame wide>
      <CalendarHeader view="month" label={formatMonthLabel(year, month)} currentMonthKey={currentMonthKey} currentWeekStart={currentWeekStart} />
      <div className="mb-4 flex justify-center gap-4">
        <a className="btn" href={`/calendar?view=month&month=${formatMonthKey(prevMonth.year, prevMonth.month)}`}>
          ← prev
        </a>
        <a className="btn" href={`/calendar?view=month&month=${currentMonthKey}`}>
          today
        </a>
        <a className="btn" href={`/calendar?view=month&month=${formatMonthKey(nextMonth.year, nextMonth.month)}`}>
          next →
        </a>
      </div>
      <MonthGrid year={year} month={month} byDay={byDay} today={today} />
    </Frame>
  );
}

function CalendarHeader({
  view,
  label,
  currentMonthKey,
  currentWeekStart,
}: {
  view: "month" | "week";
  label: string;
  currentMonthKey: string;
  currentWeekStart: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl text-ink">{label}</h1>
      <div className="flex gap-2 text-sm">
        <a
          href={`/calendar?view=month&month=${currentMonthKey}`}
          className={`btn ${view === "month" ? "border-oxblood-bright text-ink" : ""}`}
        >
          month
        </a>
        <a
          href={`/calendar?view=week&week=${currentWeekStart}`}
          className={`btn ${view === "week" ? "border-oxblood-bright text-ink" : ""}`}
        >
          week
        </a>
      </div>
    </div>
  );
}

function groupEntries(
  events: { id: string; title: string; start_time: string; location: string | null }[],
  tasks: { id: string; title: string; due_date: string; priority: string | null }[],
) {
  const byDay = new Map<string, CalendarEntry[]>();

  const push = (key: string, entry: CalendarEntry) => {
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  };

  for (const e of events) {
    const key = dateKeyInZone(new Date(e.start_time));
    push(key, {
      id: `event-${e.id}`,
      kind: "event",
      title: e.title,
      time: new Date(e.start_time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        timeZone: APP_TIMEZONE,
      }),
      href: "/events",
      priority: null,
    });
  }

  for (const t of tasks) {
    const key = dateKeyInZone(new Date(t.due_date));
    push(key, {
      id: `task-${t.id}`,
      kind: "task",
      title: t.title,
      time: null,
      href: "/tasks",
      priority: t.priority,
    });
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }

  return byDay;
}
