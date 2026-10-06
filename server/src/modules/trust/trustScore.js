import { TRUST_RULES, VERIFICATION_RULES } from '@tindak/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

export function roundTo(value, digits = 1) {
  if (value === null || value === undefined) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function weightedRating(ratingCount, ratingSum) {
  const prior = TRUST_RULES.PRIOR_RATING_COUNT;
  return (prior * TRUST_RULES.PRIOR_RATING_STARS + ratingSum) / (prior + ratingCount);
}

export function computeTrustScore({ ratingCount, ratingSum, responseRate }) {
  const rating = weightedRating(ratingCount, ratingSum);
  if (responseRate === null || responseRate === undefined) return rating;
  return TRUST_RULES.RATING_WEIGHT * rating + TRUST_RULES.RESPONSE_WEIGHT * responseRate * 5;
}

export function computeTrustLabel({ ratingCount, trustScore }) {
  if (ratingCount < TRUST_RULES.NEW_BELOW_RATING_COUNT) return 'NEW';
  const score = roundTo(trustScore, 1);
  if (score >= TRUST_RULES.TRUSTED_MIN_SCORE) return 'TRUSTED';
  if (score < TRUST_RULES.CAUTION_BELOW_SCORE) return 'CAUTION';
  return 'NONE';
}

export function computeResponseRate(reports, now = new Date()) {
  const window = TRUST_RULES.RESPONSE_WINDOW_DAYS * DAY_MS;
  let eligible = 0;
  let responded = 0;
  for (const report of reports) {
    const createdAt = new Date(report.createdAt).getTime();
    const touchedAt = report.firstTouchedAt ? new Date(report.firstTouchedAt).getTime() : null;
    if (touchedAt === null && now.getTime() - createdAt <= window) continue;
    eligible += 1;
    if (touchedAt !== null && touchedAt - createdAt <= window) responded += 1;
  }
  return eligible === 0 ? null : responded / eligible;
}

export function computeRejectedRate(totalReports, rejectedReports) {
  return totalReports === 0 ? 0 : rejectedReports / totalReports;
}

export function boardAgeDays(board, now = new Date()) {
  return Math.floor((now.getTime() - new Date(board.createdAt).getTime()) / DAY_MS);
}

export function candidateChecklist(board, { openFakeBoardFlags, lastSkippedAt }, now = new Date()) {
  const cooldownEnds = lastSkippedAt
    ? new Date(new Date(lastSkippedAt).getTime() + VERIFICATION_RULES.SKIP_COOLDOWN_DAYS * DAY_MS)
    : null;
  return [
    { key: 'COMMUNITY', passed: board.verification === 'COMMUNITY' },
    {
      key: 'RATING_COUNT',
      passed: board.ratingCount >= VERIFICATION_RULES.MIN_RATING_COUNT,
      value: board.ratingCount,
    },
    {
      key: 'TRUST_SCORE',
      passed:
        board.trustScore !== null &&
        roundTo(board.trustScore, 1) >= VERIFICATION_RULES.MIN_TRUST_SCORE,
      value: roundTo(board.trustScore, 1),
    },
    {
      key: 'BOARD_AGE',
      passed: boardAgeDays(board, now) >= VERIFICATION_RULES.MIN_BOARD_AGE_DAYS,
      value: boardAgeDays(board, now),
    },
    { key: 'ACTIVE', passed: board.status === 'ACTIVE', value: board.status },
    { key: 'NO_FAKE_BOARD_FLAG', passed: openFakeBoardFlags === 0, value: openFakeBoardFlags },
    {
      key: 'NO_SKIP_COOLDOWN',
      passed: !cooldownEnds || cooldownEnds <= now,
      value: cooldownEnds,
    },
  ];
}

export function isCandidate(checklist) {
  return checklist.every((item) => item.passed);
}
