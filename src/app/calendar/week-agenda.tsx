import Link from "next/link";
import { Panel, PanelEmpty } from "../panel";
import { addDaysToKey, parseDateKey } from "./date-utils";
import type { CalendarEntry } from "./types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekAgenda({
  weekStart,
  byDay,
  today,
}: {
  weekStart: string;
  byDay: Map<string, CalendarEntry[]>;
  today: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 7 }).map((_, i) => {
        const key = addDaysToKey(weekStart, i);
        const { month, day } = parseDateKey(key);
        const entries = byDay.get(key) ?? [];
        const isToday = key === today;

        return (
          <Panel
            key={key}
            title={`${WEEKDAYS[i]}${isToday ? " (today)" : ""}`}
            count={`${month}/${day}`}
          >
            {entries.length ? (
              entries.map((entry) => (
                <Link href={entry.href} className="row" key={entry.id}>
                  {entry.time ? <span className="nums meta w-16 shrink-0">{entry.time}</span> : null}
                  <span className="title">
                    {entry.kind === "task" ? "○ " : null}
                    {entry.title}
                  </span>
                </Link>
              ))
            ) : (
              <PanelEmpty>nothing</PanelEmpty>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
