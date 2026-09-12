// Pure calendar-arithmetic helpers for the month/week grid. These work on
// plain "YYYY-MM" / "YYYY-MM-DD" calendar keys (not instants), so there's no
// timezone conversion here — that already happened wherever the key was
// produced (see dateKeyInZone in lib/timezone.ts). Weekday-of-a-date and
// day-count-in-a-month are calendar facts, independent of timezone, so
// representing them as UTC internally is just a neutral calculator.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 0 = Sunday .. 6 = Saturday
export function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToKey(key: string, delta: number) {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return formatDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// The Sunday on or before the given date key.
export function startOfWeekKey(key: string) {
  const { year, month, day } = parseDateKey(key);
  return addDaysToKey(key, -weekdayOf(year, month, day));
}

export function formatWeekLabel(startKey: string) {
  const { month, day } = parseDateKey(startKey);
  const endKey = addDaysToKey(startKey, 6);
  const end = parseDateKey(endKey);
  const startLabel = `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
  const endLabel =
    end.month === month
      ? `${end.day}`
      : `${MONTH_NAMES[end.month - 1].slice(0, 3)} ${end.day}`;
  return `${startLabel} – ${endLabel}, ${end.year}`;
}
