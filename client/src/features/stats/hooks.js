import { useQuery } from '@tanstack/react-query';
import { STATS_DEFAULT_RANGE } from '@tindak/shared';
import { getBoardStats } from './api.js';

export const boardStatsKey = (slug, range) => ['boards', slug, 'stats', range];

export function useBoardStats(slug, range = STATS_DEFAULT_RANGE) {
  return useQuery({
    queryKey: boardStatsKey(slug, range),
    queryFn: () => getBoardStats(slug, range),
    enabled: Boolean(slug),
  });
}
