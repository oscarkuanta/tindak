import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBoardReport,
  getBoardReports,
  getMyReports,
  getReport,
  getTrackedReport,
} from './api.js';

export const boardReportsKey = (slug, params) => ['boards', slug, 'reports', params];
export const reportKey = (id) => ['reports', id];
export const trackedReportKey = (code, secret) => ['reports', 'track', code, secret];
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

export function useReport(id) {
  return useQuery({
    queryKey: reportKey(id),
    queryFn: () => getReport(id),
    enabled: Boolean(id),
  });
}

export function useTrackedReport(code, secret) {
  return useQuery({
    queryKey: trackedReportKey(code, secret),
    queryFn: () => getTrackedReport(code, secret),
    enabled: Boolean(code && secret),
  });
}

export function useMyReports(params = {}) {
  return useQuery({
    queryKey: myReportsKey(params),
    queryFn: () => getMyReports(params),
  });
}
