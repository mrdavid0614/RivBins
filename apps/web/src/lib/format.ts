const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "Oct 4, 2026, 1:42 AM", or the fallback for a missing date. */
export function formatDateTime(iso: string | null, fallback = '—'): string {
  return iso ? dateTime.format(new Date(iso)) : fallback;
}


/** "3 days ago" style age of an ISO timestamp relative to `now`. */
export function formatAge(iso: string, now: Date): string {
  const days = (now.getTime() - Date.parse(iso)) / 86_400_000;
  if (days < 1 / 24) return 'just now';
  if (days < 1) return `${Math.floor(days * 24)} h ago`;
  const whole = Math.floor(days);
  return `${whole} day${whole === 1 ? '' : 's'} ago`;
}
