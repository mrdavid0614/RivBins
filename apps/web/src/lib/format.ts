const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "Oct 4, 2026, 1:42 AM", or the fallback for a missing date. */
export function formatDateTime(iso: string | null, fallback = '—'): string {
  return iso ? dateTime.format(new Date(iso)) : fallback;
}

