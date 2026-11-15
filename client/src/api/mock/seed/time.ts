/**
 * Date helper of the demo data: everything is expressed as "N days ago",
 * so the demo always looks fresh whenever it is created.
 */

const DAY = 86_400_000

/** ISO timestamp of `days` days ago at the given local time (negative `days` means the future). */
export function daysAgo(days: number, hour = 11, minute = 20): string {
  const date = new Date(Date.now() - days * DAY)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}
