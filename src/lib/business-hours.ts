/**
 * Business hours utility
 * Working hours: 08:00 – 18:00 BRT (UTC-3), Mon–Fri
 * 10 useful hours per business day
 */

const BRT_OFFSET = -3; // UTC-3
const WORK_START = 8;   // 08:00
const WORK_END = 18;    // 18:00
const WORK_HOURS_PER_DAY = WORK_END - WORK_START; // 10h

/** Convert any Date to BRT hours (0-23) */
function toBrtHour(date: Date): number {
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  return ((utcH + BRT_OFFSET) % 24 + 24) % 24;
}

/** Get BRT day of week (0=Sun, 6=Sat) */
function toBrtWeekday(date: Date): number {
  const brt = new Date(date.getTime() + BRT_OFFSET * 3600000);
  return brt.getUTCDay();
}

/** Check if a given moment is within business hours */
function isBusinessTime(date: Date): boolean {
  const day = toBrtWeekday(date);
  if (day === 0 || day === 6) return false;
  const h = toBrtHour(date);
  return h >= WORK_START && h < WORK_END;
}

/**
 * Add N business hours to a starting date.
 * Returns the resulting Date (due date).
 */
export function addBusinessHours(from: Date, hours: number): Date {
  let remaining = hours * 60; // work in minutes for precision
  const cursor = new Date(from.getTime());

  // If starting outside business hours, advance to next business start
  if (!isBusinessTime(cursor)) {
    advanceToNextBusinessStart(cursor);
  }

  while (remaining > 0) {
    const brtH = toBrtHour(cursor);
    const minutesLeftToday = (WORK_END - brtH) * 60;

    if (remaining <= minutesLeftToday) {
      cursor.setTime(cursor.getTime() + remaining * 60000);
      remaining = 0;
    } else {
      remaining -= minutesLeftToday;
      // Move to end of day then advance to next business day start
      cursor.setTime(cursor.getTime() + minutesLeftToday * 60000);
      advanceToNextBusinessStart(cursor);
    }
  }

  return cursor;
}

/**
 * Calculate remaining business minutes between now and a due date.
 * Returns negative if overdue.
 */
export function remainingBusinessMinutes(dueDate: Date, now?: Date): number {
  const current = now ? new Date(now.getTime()) : new Date();

  if (current >= dueDate) {
    // Calculate overdue business minutes (negative)
    return -countBusinessMinutesBetween(dueDate, current);
  }

  return countBusinessMinutesBetween(current, dueDate);
}

/** Count business minutes between two dates (from < to) */
function countBusinessMinutesBetween(from: Date, to: Date): number {
  let total = 0;
  const cursor = new Date(from.getTime());

  // If starting outside business hours, advance
  if (!isBusinessTime(cursor)) {
    advanceToNextBusinessStart(cursor);
  }

  // Edge: if advancing past "to", no business time in between
  if (cursor >= to) return 0;

  while (cursor < to) {
    const brtH = toBrtHour(cursor);
    const minutesLeftToday = (WORK_END - brtH) * 60;
    const minutesToEnd = (to.getTime() - cursor.getTime()) / 60000;

    const chunk = Math.min(minutesLeftToday, minutesToEnd);
    total += Math.max(0, chunk);

    if (minutesToEnd <= minutesLeftToday) {
      break;
    }

    // Advance to next business day
    cursor.setTime(cursor.getTime() + minutesLeftToday * 60000);
    advanceToNextBusinessStart(cursor);
  }

  return Math.round(total);
}

/** Advance cursor to the next business day at WORK_START BRT */
function advanceToNextBusinessStart(cursor: Date): void {
  // Move to next day at 08:00 BRT
  const brt = new Date(cursor.getTime() + BRT_OFFSET * 3600000);
  brt.setUTCHours(WORK_START - BRT_OFFSET, 0, 0, 0);

  // If we're already past or at the start time, go to next day
  if (brt.getTime() <= cursor.getTime() + BRT_OFFSET * 3600000) {
    // Actually let's simplify: set to next calendar day
    brt.setUTCDate(brt.getUTCDate() + 1);
  }

  // Rebuild cursor from BRT
  cursor.setTime(brt.getTime() - BRT_OFFSET * 3600000);

  // Skip weekends
  let day = toBrtWeekday(cursor);
  while (day === 0 || day === 6) {
    cursor.setTime(cursor.getTime() + 24 * 3600000);
    day = toBrtWeekday(cursor);
  }

  // Ensure we're at exactly WORK_START BRT
  const finalBrt = new Date(cursor.getTime() + BRT_OFFSET * 3600000);
  finalBrt.setUTCHours(WORK_START - BRT_OFFSET, 0, 0, 0);
  cursor.setTime(finalBrt.getTime() - BRT_OFFSET * 3600000);
}

/**
 * Format remaining business minutes as human-readable countdown.
 */
export function formatBusinessCountdown(businessMinutes: number): string {
  const absMin = Math.abs(businessMinutes);
  const sign = businessMinutes < 0 ? '−' : '';

  const totalHours = absMin / 60;

  if (totalHours >= WORK_HOURS_PER_DAY) {
    const days = Math.floor(totalHours / WORK_HOURS_PER_DAY);
    const hours = Math.floor(totalHours % WORK_HOURS_PER_DAY);
    return `${sign}${days}d ${hours}h`;
  }
  if (absMin >= 60) {
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    return `${sign}${hours}h ${mins}m`;
  }
  return `${sign}${absMin}m`;
}
