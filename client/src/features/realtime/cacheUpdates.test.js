import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { applyMyEngagement, applyReportUpdated } from './cacheUpdates.js';

const key = ['boards', 'jalan-rungkut', 'reports', { sort: 'hot', page: 1 }];

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(key, {
    data: [
      {
        id: 7,
        status: 'NEW',
        supportCount: 4,
        reactionCounts: {},
        mySupport: false,
        myReaction: null,
      },
      {
        id: 8,
        status: 'NEW',
        supportCount: 1,
        reactionCounts: {},
        mySupport: false,
        myReaction: null,
      },
    ],
  });
  return queryClient;
}

describe('cacheUpdates', () => {
  it('menyimpan dukungan milik sendiri di daftar dan tidak tertimpa update realtime', () => {
    const queryClient = setup();

    applyMyEngagement(queryClient, 7, {
      supportCount: 5,
      reactionCounts: { DANGEROUS: 1 },
      mySupport: true,
      myReaction: 'DANGEROUS',
    });
    applyReportUpdated(queryClient, {
      id: 7,
      status: 'NEW',
      supportCount: 5,
      reactionCounts: { DANGEROUS: 1 },
    });

    const [first, second] = queryClient.getQueryData(key).data;
    expect(first).toMatchObject({ supportCount: 5, mySupport: true, myReaction: 'DANGEROUS' });
    expect(second).toMatchObject({ supportCount: 1, mySupport: false });
  });

  it('update realtime hanya mengubah angka publik', () => {
    const queryClient = setup();

    applyReportUpdated(queryClient, {
      id: 8,
      status: 'IN_PROGRESS',
      supportCount: 3,
      reactionCounts: {},
    });

    expect(queryClient.getQueryData(key).data[1]).toMatchObject({
      status: 'IN_PROGRESS',
      supportCount: 3,
      mySupport: false,
    });
  });
});
