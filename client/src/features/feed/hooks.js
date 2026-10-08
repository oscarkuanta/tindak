import { useQuery } from '@tanstack/react-query';
import { getHomeFeed } from './api.js';

export const homeFeedKey = (params) => ['feed', 'home', params];

export function useHomeFeed(params, options = {}) {
  return useQuery({
    queryKey: homeFeedKey(params),
    queryFn: () => getHomeFeed(params),
    enabled: options.enabled ?? true,
  });
}
