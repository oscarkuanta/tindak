import { describe, expect, it } from 'vitest';
import {
  boardBaseSlug,
  nextAvailableSlug,
  slugify,
  stripCityPrefix,
} from '../src/utils/slugify.js';
import {
  compareSearchResults,
  nameMatchRank,
  rankSimilarBoards,
  similarTokens,
} from '../src/modules/boards/boards.ranking.js';

describe('slugify', () => {
  it.each([
    ['Jalan Rungkut Madya', 'jalan-rungkut-madya'],
    ['  SMKN 1   Surabaya!! ', 'smkn-1-surabaya'],
    ['Café Ñandú', 'cafe-nandu'],
    ['RT 05 / RW 02', 'rt-05-rw-02'],
    ['Sampah & Drainase', 'sampah-dan-drainase'],
    ['---', ''],
  ])('%s menjadi %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('memotong slug panjang tanpa tanda hubung di akhir', () => {
    const slug = slugify(`${'a'.repeat(99)} b`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('membuang awalan Kota, Kabupaten, dan Administrasi dari nama kota', () => {
    expect(stripCityPrefix('Kota Surabaya')).toBe('Surabaya');
    expect(stripCityPrefix('Kabupaten Sidoarjo')).toBe('Sidoarjo');
    expect(stripCityPrefix('Kota Administrasi Jakarta Selatan')).toBe('Jakarta Selatan');
    expect(boardBaseSlug('Alun Alun', 'Kabupaten Sidoarjo')).toBe('alun-alun-sidoarjo');
    expect(boardBaseSlug('!!!', 'Kota Surabaya')).toBe('surabaya');
  });

  it('tidak mengulang nama kota yang sudah ada di akhir nama Board', () => {
    expect(boardBaseSlug('Alun-Alun Sidoarjo', 'Kabupaten Sidoarjo')).toBe('alun-alun-sidoarjo');
    expect(boardBaseSlug('SMAN 5 Surabaya', 'Kota Surabaya')).toBe('sman-5-surabaya');
    expect(boardBaseSlug('Surabaya', 'Kota Surabaya')).toBe('surabaya');
    expect(boardBaseSlug('Surabaya Barat Raya', 'Kota Surabaya')).toBe(
      'surabaya-barat-raya-surabaya',
    );
    expect(boardBaseSlug('Pasar Sidoarjoan', 'Kabupaten Sidoarjo')).toBe(
      'pasar-sidoarjoan-sidoarjo',
    );
  });

  it('mencari akhiran angka berikutnya saat slug bentrok', () => {
    expect(nextAvailableSlug('taman', [])).toBe('taman');
    expect(nextAvailableSlug('taman', ['taman'])).toBe('taman-2');
    expect(nextAvailableSlug('taman', ['taman', 'taman-2', 'taman-3'])).toBe('taman-4');
    expect(nextAvailableSlug('taman', ['taman-kota'])).toBe('taman');
  });
});

describe('urutan pencarian Board', () => {
  const board = (id, name, verification = 'COMMUNITY', createdAt = '2026-01-01') => ({
    id,
    name,
    verification,
    createdAt,
    activeReportCount: 0,
  });

  it('memberi peringkat sama persis, diawali, lalu mengandung', () => {
    expect(nameMatchRank('Rungkut', 'rungkut')).toBe(0);
    expect(nameMatchRank('Rungkut Madya', 'rungkut')).toBe(1);
    expect(nameMatchRank('Taman Rungkut', 'rungkut')).toBe(2);
    expect(nameMatchRank('Taman Kota', 'rungkut')).toBe(3);
  });

  it('mengurutkan kecocokan nama, lalu OFFICIAL, lalu yang terbaru', () => {
    const boards = [
      board(1, 'Taman Rungkut', 'OFFICIAL'),
      board(2, 'Rungkut Lama', 'COMMUNITY', '2026-03-01'),
      board(3, 'Rungkut Baru', 'OFFICIAL', '2026-01-01'),
      board(4, 'Rungkut Tengah', 'COMMUNITY', '2026-05-01'),
    ];

    const sorted = [...boards].sort(compareSearchResults('rungkut'));

    expect(sorted.map((item) => item.id)).toEqual([3, 4, 2, 1]);
  });
});

describe('Board mirip', () => {
  it('mengabaikan kata umum jika masih ada kata khusus', () => {
    expect(similarTokens('Jalan Rungkut Madya')).toEqual(['rungkut', 'madya']);
    expect(similarTokens('SMKN 1 Surabaya')).toEqual(['surabaya']);
    expect(similarTokens('Jalan Raya')).toEqual(['jalan', 'raya']);
    expect(similarTokens('A B')).toEqual([]);
  });

  it('mengurutkan berdasarkan jumlah kata yang cocok', () => {
    const boards = [
      { id: 1, name: 'Rungkut Industri', verification: 'COMMUNITY' },
      { id: 2, name: 'Jalan Rungkut Madya', verification: 'COMMUNITY' },
      { id: 3, name: 'Taman Bungkul', verification: 'COMMUNITY' },
    ];

    const result = rankSimilarBoards(boards, 'Rungkut Madya', 5);

    expect(result.map((item) => item.id)).toEqual([2, 1]);
  });
});
