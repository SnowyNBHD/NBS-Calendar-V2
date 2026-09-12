export type CalendarEntry = {
  id: string;
  kind: "event" | "task";
  title: string;
  time: string | null;
  href: string;
  priority: string | null;
};
