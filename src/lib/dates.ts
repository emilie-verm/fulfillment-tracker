// Everyone on the team is in the Eastern time zone, but the server itself
// isn't (Railway runs containers in UTC) — .toLocaleString() with no
// explicit zone would render server time, not the team's local time. This
// pins every displayed timestamp to Eastern, DST-aware, regardless of where
// the app is actually hosted.
const TIME_ZONE = "America/New_York";

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", { timeZone: TIME_ZONE });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: TIME_ZONE });
}
