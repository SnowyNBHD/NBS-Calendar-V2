import Link from "next/link";
import { daysInMonth, formatDateKey, weekdayOf } from "./date-utils";
import type { CalendarEntry } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

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

  return (
    <div className="panel cal-grid">
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
                {entry.kind === "task" ? "○ " : null}
                {entry.time ? <span className="nums">{entry.time}</span> : null}
                {entry.title}
              </Link>
            ))}
            {entries.length > MAX_VISIBLE ? (
              <span className="cal-entry cal-more">+{entries.length - MAX_VISIBLE} more</span>
            ) : null}
          </div>
        );
      })}

      {Array.from({ length: trailingBlanks }).map((_, i) => (
        <div className="cal-cell" key={`trail-${i}`} />
      ))}
    </div>
  );
}
