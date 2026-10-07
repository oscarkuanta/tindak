export function relativeTime(value, now = Date.now()) {
  if (!value) return 'Waktu tidak tersedia';
  const minutes = Math.round((new Date(value).getTime() - now) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
