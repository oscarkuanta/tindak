import { describe, expect, it } from 'vitest';
import {
  candidateChecklist,
  computeRejectedRate,
  computeResponseRate,
  computeTrustLabel,
  computeTrustScore,
  isCandidate,
  roundTo,
  weightedRating,
} from '../src/modules/trust/trustScore.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-06T00:00:00.000Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * DAY);

describe('Skor Kepercayaan', () => {
  it('contoh Board terpercaya menghasilkan 4,4', () => {
    const board = { ratingCount: 40, ratingSum: 180, responseRate: 0.9 };

    const score = computeTrustScore(board);

    expect(roundTo(weightedRating(40, 180), 2)).toBe(4.33);
    expect(roundTo(score, 1)).toBe(4.4);
    expect(computeTrustLabel({ ratingCount: 40, trustScore: score })).toBe('TRUSTED');
  });

  it('contoh Board kurang tanggap menghasilkan 2,3', () => {
    const score = computeTrustScore({ ratingCount: 10, ratingSum: 20, responseRate: 0.45 });

    expect(roundTo(score, 1)).toBe(2.3);
    expect(computeTrustLabel({ ratingCount: 10, trustScore: score })).toBe('CAUTION');
  });

  it('tanpa laporan skor hanya dari rating tertimbang', () => {
    expect(computeTrustScore({ ratingCount: 0, ratingSum: 0, responseRate: null })).toBe(3);
    expect(computeTrustScore({ ratingCount: 5, ratingSum: 25, responseRate: null })).toBe(4);
  });

  it('label mengikuti batas', () => {
    expect(computeTrustLabel({ ratingCount: 4, trustScore: 5 })).toBe('NEW');
    expect(computeTrustLabel({ ratingCount: 5, trustScore: 4 })).toBe('TRUSTED');
    expect(computeTrustLabel({ ratingCount: 5, trustScore: 3.96 })).toBe('TRUSTED');
    expect(computeTrustLabel({ ratingCount: 5, trustScore: 3.9 })).toBe('NONE');
    expect(computeTrustLabel({ ratingCount: 5, trustScore: 2.5 })).toBe('NONE');
    expect(computeTrustLabel({ ratingCount: 5, trustScore: 2.44 })).toBe('CAUTION');
  });

  it('tingkat tanggap menghitung laporan lama atau yang sudah disentuh', () => {
    const reports = [
      { createdAt: daysAgo(2), firstTouchedAt: null },
      { createdAt: daysAgo(3), firstTouchedAt: daysAgo(2) },
      { createdAt: daysAgo(20), firstTouchedAt: daysAgo(18) },
      { createdAt: daysAgo(20), firstTouchedAt: daysAgo(10) },
      { createdAt: daysAgo(9), firstTouchedAt: null },
    ];

    expect(computeResponseRate(reports, NOW)).toBe(0.5);
    expect(computeResponseRate([{ createdAt: daysAgo(1), firstTouchedAt: null }], NOW)).toBeNull();
    expect(computeResponseRate([], NOW)).toBeNull();
  });

  it('persentase ditolak', () => {
    expect(computeRejectedRate(0, 0)).toBe(0);
    expect(computeRejectedRate(8, 2)).toBe(0.25);
  });
});

describe('Syarat kandidat Official', () => {
  const eligible = {
    verification: 'COMMUNITY',
    ratingCount: 20,
    trustScore: 4.0,
    createdAt: daysAgo(30),
    status: 'ACTIVE',
  };
  const context = { openFakeBoardFlags: 0, lastSkippedAt: null };
  const failing = (board, extra = {}) =>
    candidateChecklist({ ...eligible, ...board }, { ...context, ...extra }, NOW)
      .filter((item) => !item.passed)
      .map((item) => item.key);

  it('lolos jika semua syarat terpenuhi', () => {
    expect(isCandidate(candidateChecklist(eligible, context, NOW))).toBe(true);
  });

  it('gagal jika satu syarat tidak terpenuhi', () => {
    expect(failing({ verification: 'OFFICIAL' })).toEqual(['COMMUNITY']);
    expect(failing({ ratingCount: 19 })).toEqual(['RATING_COUNT']);
    expect(failing({ trustScore: 3.94 })).toEqual(['TRUST_SCORE']);
    expect(failing({ trustScore: null })).toEqual(['TRUST_SCORE']);
    expect(failing({ createdAt: daysAgo(29) })).toEqual(['BOARD_AGE']);
    expect(failing({ status: 'INACTIVE' })).toEqual(['ACTIVE']);
    expect(failing({ status: 'FROZEN' })).toEqual(['ACTIVE']);
    expect(failing({}, { openFakeBoardFlags: 1 })).toEqual(['NO_FAKE_BOARD_FLAG']);
    expect(failing({}, { lastSkippedAt: daysAgo(29) })).toEqual(['NO_SKIP_COOLDOWN']);
    expect(failing({}, { lastSkippedAt: daysAgo(30) })).toEqual([]);
  });
});
