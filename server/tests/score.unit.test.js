import { describe, expect, it } from 'vitest';
import { SEVERITY_WEIGHTS, daysOpen, hotWindowStart, priorityScore } from '@tindak/shared';
import { comparePopularity } from '../src/modules/boards/boards.ranking.js';

const DAY = 24 * 60 * 60 * 1000;

describe('priorityScore (contoh PRODUCT.md)', () => {
  it('lubang besar Berbahaya, 5 dukungan, 4 reaksi 🚨, 3 hari = 53', () => {
    expect(
      priorityScore({ supportCount: 5, dangerousCount: 4, severity: 'DANGEROUS', daysOpen: 3 }),
    ).toBe(53);
  });

  it('lampu taman mati Rendah, 30 dukungan, 2 reaksi 😤, 1 hari = 34', () => {
    expect(
      priorityScore({ supportCount: 30, annoyingCount: 2, severity: 'LOW', daysOpen: 1 }),
    ).toBe(34);
  });

  it('memakai bobot setiap komponen', () => {
    expect(SEVERITY_WEIGHTS).toEqual({ LOW: 0, MEDIUM: 10, DANGEROUS: 30 });
    expect(priorityScore({ longStandingCount: 3, severity: 'MEDIUM' })).toBe(16);
    expect(priorityScore({})).toBe(0);
  });
});

describe('daysOpen', () => {
  const now = new Date('2026-10-10T12:00:00Z');

  it('menghitung hari penuh sampai sekarang atau sampai ditutup', () => {
    expect(daysOpen(new Date(now - 2.5 * DAY), null, now)).toBe(2);
    expect(daysOpen(new Date(now - 10 * DAY), new Date(now - 7 * DAY), now)).toBe(3);
    expect(daysOpen(new Date(now + DAY), null, now)).toBe(0);
  });

  it('jendela hot 48 jam', () => {
    expect(now - hotWindowStart(now)).toBe(2 * DAY);
  });
});

describe('comparePopularity', () => {
  it('pengikut, lalu laporan aktif, lalu Official, lalu terbaru', () => {
    const board = (id, followerCount, activeReportCount, verification, createdAt) => ({
      id,
      followerCount,
      activeReportCount,
      verification,
      createdAt,
    });
    const boards = [
      board(1, 1, 5, 'COMMUNITY', '2026-01-01'),
      board(2, 3, 0, 'COMMUNITY', '2026-01-01'),
      board(3, 1, 5, 'OFFICIAL', '2026-01-01'),
      board(4, 1, 5, 'COMMUNITY', '2026-05-01'),
    ];
    expect(boards.sort(comparePopularity).map((item) => item.id)).toEqual([2, 3, 4, 1]);
  });
});
