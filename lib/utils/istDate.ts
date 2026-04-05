const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes

/**
 * Get the current date and time in IST as a Date object.
 * The returned Date's UTC values are shifted so that
 * getUTCFullYear/Month/Date return the IST values.
 */
export function nowInIST(): Date {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/**
 * Given any Date (in UTC), return that instant expressed
 * as IST. Useful for formatting.
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Get today's calendar date in IST as a plain Date object
 * at midnight UTC — suitable for storing in @db.Date columns.
 *
 * Example: if it is 2025-04-04 23:30 IST, this returns
 * a Date representing 2025-04-04T00:00:00.000Z — which Prisma
 * will store as the date 2025-04-04 in a @db.Date column.
 */
export function todayInIST(): Date {
  const ist = nowInIST();
  // Extract IST date components
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();
  // Return midnight UTC of that IST date
  return new Date(Date.UTC(year, month, day));
}

/**
 * Convert an ISO date string like "2025-04-04" to a Date
 * suitable for @db.Date queries (midnight UTC of that date).
 */
export function parseDateParam(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get the start and end of a given IST date as UTC DateTimes.
 * Use these for querying DateTime columns (like occurredAt).
 *
 * For date "2025-04-04":
 *   dayStartUTC = 2025-04-03T18:30:00.000Z  (midnight IST)
 *   dayEndUTC   = 2025-04-04T18:29:59.999Z  (11:59:59pm IST)
 */
export function istDayBoundsUTC(date: Date): {
  dayStartUTC: Date;
  dayEndUTC: Date;
} {
  // date is assumed to be midnight UTC of the IST calendar date
  // Midnight IST = previous day 18:30 UTC
  const dayStartUTC = new Date(date.getTime() - IST_OFFSET_MS);
  const dayEndUTC = new Date(
    dayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1
  );
  return { dayStartUTC, dayEndUTC };
}

/**
 * Format a Date for display to the user in IST.
 * Returns a string like "Friday, 4 April 2025"
 */
export function formatDateIST(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format a Date for display as a time in IST.
 * Returns a string like "11:30 PM"
 */
export function formatTimeIST(date: Date): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format for display as date + time.
 * Returns "4 Apr 2025, 11:30 PM"
 */
export function formatDateTimeIST(date: Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Convert a Date to a "YYYY-MM-DD" string in IST.
 * Use this when you need to compare or store dates as strings.
 */
export function toISTDateString(date: Date): string {
  const ist = toIST(date);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
