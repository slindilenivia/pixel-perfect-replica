import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";

/** Local calendar date as yyyy-MM-dd. */
export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function todayKey(now = new Date()) {
  return toDateKey(now);
}

export function offsetKey(days: number, now = new Date()) {
  return toDateKey(addDays(now, days));
}

export function daysUntil(dateKey: string, now = new Date()) {
  return differenceInCalendarDays(parseISO(dateKey), now);
}

export function formatDue(dateKey: string, now = new Date()) {
  const diff = daysUntil(dateKey, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff < 7) return format(parseISO(dateKey), "EEEE");
  return format(parseISO(dateKey), "d MMM");
}
