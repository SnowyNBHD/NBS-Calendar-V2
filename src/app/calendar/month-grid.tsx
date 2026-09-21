import Link from "next/link";
import { daysInMonth, formatDateKey, startOfWeekKey, weekdayOf } from "./date-utils";
import type { CalendarEntry } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

// "12:00 AM" -> "12a", "5:30 PM" -> "5:30p": keeps titles readable in a narrow cell.
const compactTime = (time: string) => time.replace(":00", "").replace(" AM", "a").replace(" PM", "p");

export default function MonthGrid({
  year,
  month,
  byDay,
  today,
}: {
  year: number;
  month: number;
  byDay: Map<string, CalendarEntry[]>;
  today: string;
}) {
  const total = daysInMonth(year, month);
  const leadingBlanks = weekdayOf(year, month, 1);
  const trailingBlanks = (7 - ((leadingBlanks + total) % 7)) % 7;

  // The phone view lists only days that have something on them (plus today),
  // since a seven-column grid is too narrow to read at that width.
  const agendaDays = Array.from({ length: total }, (_, i) => i + 1).filter((day) => {
    const key = formatDateKey(year, month, day);
    return key === today || (byDay.get(key)?.length ?? 0) > 0;
  });

  return (
    <>
      <div className="panel cal-grid hidden sm:grid">
        {WEEKDAYS.map((w) => (
          <div className="cal-weekday" key={w}>
            {w}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div className="cal-cell" key={`lead-${i}`} />
        ))}

        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const key = formatDateKey(year, month, day);
          const entries = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <div className={`cal-cell ${isToday ? "today" : ""}`} key={key}>
              <span className="nums day-num">{day}</span>
              {entries.slice(0, MAX_VISIBLE).map((entry) => (
                <Link href={entry.href} className="cal-entry" key={entry.id}>
                  {entry.time ? <span className="nums cal-time">{compactTime(entry.time)}</span> : null}
                  <span className="cal-title">
                    {entry.kind === "task" ? "○ " : null}
                    {entry.title}
                  </span>
                </Link>
              ))}
              {entries.length > MAX_VISIBLE ? (
                <Link
                  href={`/calendar?view=week&week=${startOfWeekKey(key)}`}
                  className="cal-entry cal-more"
                >
                  +{entries.length - MAX_VISIBLE} more
                </Link>
              ) : null}
            </div>
          );
        })}

        {Array.from({ length: trailingBlanks }).map((_, i) => (
          <div className="cal-cell" key={`trail-${i}`} />
        ))}
      </div>

      <div className="panel sm:hidden">
        {agendaDays.length ? (
          agendaDays.map((day) => {
            const key = formatDateKey(year, month, day);
            const entries = byDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <div key={key}>
                <div className={`cal-day-head ${isToday ? "today" : ""}`}>
                  <span>
                    {WEEKDAYS[weekdayOf(year, month, day)]} <span className="nums">{day}</span>
                    {isToday ? " (today)" : ""}
                  </span>
                </div>
                {entries.length ? (
                  entries.map((entry) => (
                    <Link href={entry.href} className="row items-start" key={entry.id}>
                      <span className="nums meta w-[5.5rem] shrink-0 pt-0.5">
                        {entry.time ?? (entry.allDay ? "all day" : "due")}
                      </span>
                      <span className="title">
                        {entry.kind === "task" ? "○ " : null}
                        {entry.title}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="panel-empty">nothing</div>
                )}
              </div>
            );
          })
        ) : (
          <div className="panel-empty">nothing this month</div>
        )}
      </div>
    </>
  );
}
