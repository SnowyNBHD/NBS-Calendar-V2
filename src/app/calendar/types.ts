export type CalendarEntry = {
  id: string;
  kind: "event" | "task";
  title: string;
  time: string | null;
  allDay: boolean;
  sortKey: number;
  href: string;
  priority: string | null;
};
