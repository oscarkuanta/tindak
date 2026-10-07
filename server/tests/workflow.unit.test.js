import { describe, expect, it } from 'vitest';
import {
  REPORT_STATUSES,
  REPORT_TRANSITIONS,
  canTransition,
  reportAllowedActions,
} from '@tindak/shared';

const VALID = new Set([
  'NEW>IN_PROGRESS',
  'NEW>NEED_INFO',
  'NEW>REJECTED',
  'NEW>DUPLICATE',
  'NEED_INFO>NEW',
  'NEED_INFO>REJECTED',
  'IN_PROGRESS>AWAITING_CONFIRMATION',
  'IN_PROGRESS>REJECTED',
  'IN_PROGRESS>DUPLICATE',
  'AWAITING_CONFIRMATION>RESOLVED',
  'AWAITING_CONFIRMATION>REOPENED',
  'REOPENED>IN_PROGRESS',
  'REOPENED>AWAITING_CONFIRMATION',
]);

describe('canTransition', () => {
  const pairs = REPORT_STATUSES.flatMap((from) => REPORT_STATUSES.map((to) => [from, to]));

  it.each(pairs)('%s ke %s sesuai tabel status', (from, to) => {
    expect(canTransition(from, to)).toBe(VALID.has(`${from}>${to}`));
  });

  it('memiliki aturan untuk setiap status dan menolak status yang tidak dikenal', () => {
    expect(Object.keys(REPORT_TRANSITIONS).sort()).toEqual([...REPORT_STATUSES].sort());
    expect(canTransition('ENTAH', 'NEW')).toBe(false);
    expect(canTransition('NEW', 'ENTAH')).toBe(false);
  });
});

describe('reportAllowedActions', () => {
  const handler = { isHandler: true };
  const reporter = { isReporter: true };

  it.each([
    ['NEW', ['PROCESS', 'REQUEST_INFO', 'REJECT', 'DUPLICATE']],
    ['NEED_INFO', ['REJECT']],
    ['IN_PROGRESS', ['RESOLVE', 'REJECT', 'DUPLICATE']],
    ['AWAITING_CONFIRMATION', []],
    ['REOPENED', ['PROCESS', 'RESOLVE']],
    ['RESOLVED', []],
    ['REJECTED', []],
    ['DUPLICATE', []],
  ])('Penindak pada status %s', (status, actions) => {
    expect(reportAllowedActions({ status }, handler)).toEqual(actions);
  });

  it('pelapor hanya menjawab info yang belum dijawab dan mengonfirmasi', () => {
    expect(
      reportAllowedActions({ status: 'NEED_INFO', hasPendingInfoRequest: true }, reporter),
    ).toEqual(['ANSWER_INFO']);
    expect(
      reportAllowedActions({ status: 'NEED_INFO', hasPendingInfoRequest: false }, reporter),
    ).toEqual([]);
    expect(reportAllowedActions({ status: 'AWAITING_CONFIRMATION' }, reporter)).toEqual([
      'CONFIRM',
    ]);
    expect(reportAllowedActions({ status: 'NEW' }, reporter)).toEqual([]);
  });

  it('pengunjung biasa tidak punya aksi', () => {
    for (const status of REPORT_STATUSES) {
      expect(reportAllowedActions({ status, hasPendingInfoRequest: true })).toEqual([]);
    }
  });

  it('Penindak yang juga pelapor mendapat gabungan aksi', () => {
    expect(
      reportAllowedActions(
        { status: 'AWAITING_CONFIRMATION' },
        { isHandler: true, isReporter: true },
      ),
    ).toEqual(['CONFIRM']);
  });
});
