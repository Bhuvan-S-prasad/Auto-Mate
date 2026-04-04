/**
 * Parses a YYYY-MM-DD string and returns a Date object in the local timezone
 * representation of that same calendar day.
 */
export function parseDateOnly(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));
    // month is 0-indexed in JS Date constructor
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

/**
 * Formatters to ensure consistent weekday and date display without timezone shifts.
 */
export function getWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function getDayMonth(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  });
}

export function getYear(date: Date): number {
  return date.getFullYear();
}
