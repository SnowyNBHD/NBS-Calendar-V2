// Single-user app, single timezone. Using the server's local timezone
// (`new Date().setHours(0, 0, 0, 0)`) breaks in two ways: it silently
// changes behavior between dev (runs in your local timezone) and Vercel
// (serverless runtime defaults to UTC), and it mishandles all-day events,
// which have no timezone of their own — they're just a calendar date.
// Everything "what day is it" related should go through this file instead.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Phoenix";

function getTimezoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asIfUTC - date.getTime()) / 60000;
}

// Converts a naive "YYYY-MM-DDTHH:mm[:ss]" wall-clock string (e.g. from an
// <input type="datetime-local">, which carries no timezone of its own) into
// the UTC instant that wall-clock time represents in `timeZone`.
export function localDateTimeToUtc(dateTimeStr: string, timeZone = APP_TIMEZONE) {
  const normalized = dateTimeStr.length === 16 ? `${dateTimeStr}:00` : dateTimeStr;
  const asUTC = new Date(`${normalized}Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(asUTC, timeZone);
  return new Date(asUTC.getTime() - offsetMinutes * 60000);
}

// Converts a plain "YYYY-MM-DD" calendar date (e.g. from an all-day Google
// Calendar event) into the UTC instant of that date's midnight in
// APP_TIMEZONE.
export function localDateToUtc(dateStr: string, timeZone = APP_TIMEZONE) {
  return localDateTimeToUtc(`${dateStr}T00:00:00`, timeZone);
}

// Formats a UTC instant as the "YYYY-MM-DD" calendar date it falls on in
// `timeZone` — e.g. for grouping events fetched as UTC timestamps by the
// local day they belong to.
export function dateKeyInZone(date: Date, timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// "YYYY-MM-DD" for today, in APP_TIMEZONE.
export function todayKey(timeZone = APP_TIMEZONE) {
  return dateKeyInZone(new Date(), timeZone);
}

// Returns the [start, end) UTC instants bounding "today" in APP_TIMEZONE.
export function localDayRange(reference = new Date(), timeZone = APP_TIMEZONE) {
  const dateStr = dateKeyInZone(reference, timeZone);
  const start = localDateToUtc(dateStr, timeZone);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

// Calendar/ICS all-day items are stored at local midnight, so a bare
// "12:00 AM" is far more likely to mean "all day" than a midnight start.
export function eventTime(date: Date, timeZone = APP_TIMEZONE) {
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
  return time === "12:00 AM" ? { allDay: true, label: "all day" } : { allDay: false, label: time };
}
