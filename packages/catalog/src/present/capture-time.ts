/**
 * Short, unambiguous capture time on the 12-hour clock Indian readers use, such as "5 Oct 2026, 11:29 am".
 *
 * @example formatCaptureTime("2026-10-05T05:59:30Z", "Asia/Kolkata") // "5 Oct 2026, 11:29 am"
 */
export function formatCaptureTime(isoTimestamp: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(isoTimestamp));
}
