import { boardStatsQuerySchema } from '@tindak/shared';
import { api } from '../../lib/api.js';

export function getBoardStats(slug, range) {
  const parsed = boardStatsQuerySchema.parse({ range });
  const params = new URLSearchParams({ range: parsed.range });
  return api.get(`/boards/${encodeURIComponent(slug)}/stats?${params.toString()}`);
}
