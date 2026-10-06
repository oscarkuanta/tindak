export const SEVERITY_WEIGHTS = Object.freeze({ LOW: 0, MEDIUM: 10, DANGEROUS: 30 });

export const REACTION_WEIGHTS = Object.freeze({ DANGEROUS: 3, LONG_STANDING: 2, ANNOYING: 1 });

export const HOT_WINDOW_HOURS = 48;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysOpen(createdAt, closedAt, now = new Date()) {
  const end = closedAt ? new Date(closedAt) : now;
  return Math.max(0, Math.floor((end.getTime() - new Date(createdAt).getTime()) / DAY_MS));
}

export function priorityScore({
  supportCount = 0,
  dangerousCount = 0,
  longStandingCount = 0,
  annoyingCount = 0,
  severity = 'LOW',
  daysOpen: days = 0,
}) {
  return (
    supportCount +
    dangerousCount * REACTION_WEIGHTS.DANGEROUS +
    longStandingCount * REACTION_WEIGHTS.LONG_STANDING +
    annoyingCount * REACTION_WEIGHTS.ANNOYING +
    (SEVERITY_WEIGHTS[severity] ?? 0) +
    days * 2
  );
}

export function hotWindowStart(now = new Date()) {
  return new Date(now.getTime() - HOT_WINDOW_HOURS * 60 * 60 * 1000);
}
