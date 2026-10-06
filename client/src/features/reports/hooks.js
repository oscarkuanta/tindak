import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBoardReport, getBoardReports, getMyReports } from './api.js';

export const boardReportsKey = (slug, params) => ['boards', slug, 'reports', params];
export const myReportsKey = (params) => ['me', 'reports', params];

export function useBoardReports(slug, params) {
  return useQuery({
    queryKey: boardReportsKey(slug, params),
    queryFn: () => getBoardReports(slug, params),
    enabled: Boolean(slug),
  });
}

export function useCreateBoardReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, fields, photos }) => createBoardReport(slug, { fields, photos }),
    onSuccess: async (_response, { slug }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards', slug, 'reports'] }),
        queryClient.invalidateQueries({ queryKey: ['boards', slug] }),
        queryClient.invalidateQueries({ queryKey: ['me', 'reports'] }),
      ]);
    },
  });
}

export function useMyReports(params = {}) {
  return useQuery({
    queryKey: myReportsKey(params),
    queryFn: () => getMyReports(params),
  });
}
