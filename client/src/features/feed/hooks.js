import { useQuery } from '@tanstack/react-query';
import { POPULAR_BOARDS_LIMIT } from '@tindak/shared';
import { getHomeFeed, getPopularBoards } from './api.js';

export const homeFeedKey = (params) => ['feed', 'home', params];
export const popularBoardsKey = (limit) => ['boards', 'popular', limit];

export function useHomeFeed(params, options = {}) {
  return useQuery({
    queryKey: homeFeedKey(params),
    queryFn: () => getHomeFeed(params),
    enabled: options.enabled ?? true,
  });
}

export function usePopularBoards(limit = POPULAR_BOARDS_LIMIT) {
  return useQuery({
    queryKey: popularBoardsKey(limit),
    queryFn: () => getPopularBoards(limit),
    staleTime: 5 * 60_000,
  });
}
