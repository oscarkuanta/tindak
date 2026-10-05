import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  answerReportInfo,
  confirmReport,
  getReportDetail,
  getReportQueue,
  getTrackedReport,
  markReportDuplicate,
  processReport,
  rejectReport,
  requestReportInfo,
  resolveReport,
} from './api.js';

export const reportDetailKey = (id) => ['reports', id];
export const trackedReportKey = (code, secret) => ['reports', 'track', code, secret];
export const reportQueueKey = (slug, params = {}) => ['boards', slug, 'queue', params];

export function useReportQueue(slug, params, enabled = true) {
  return useQuery({
    queryKey: reportQueueKey(slug, params),
    queryFn: () => getReportQueue(slug, params),
    enabled: Boolean(slug) && enabled,
  });
}

export function useReportDetail(id) {
  return useQuery({
    queryKey: reportDetailKey(id),
    queryFn: () => getReportDetail(id),
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

const actions = {
  PROCESS: processReport,
  REQUEST_INFO: requestReportInfo,
  ANSWER_INFO: answerReportInfo,
  REJECT: rejectReport,
  DUPLICATE: markReportDuplicate,
  RESOLVE: resolveReport,
  CONFIRM: confirmReport,
};

export function useReportAction({ reportId, slug, trackingCode } = {}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ action, payload }) => {
      const request = actions[action];
      if (!request) throw new Error('Aksi laporan tidak tersedia');
      return request(reportId, payload);
    },
    onSuccess: async () => {
      const updates = [queryClient.invalidateQueries({ queryKey: ['reports'] })];
      if (slug)
        updates.push(queryClient.invalidateQueries({ queryKey: ['boards', slug, 'queue'] }));
      if (trackingCode) {
        updates.push(
          queryClient.invalidateQueries({
            queryKey: ['reports', 'track', trackingCode],
          }),
        );
      }
      await Promise.all(updates);
    },
  });

  return {
    ...mutation,
    runAction: (action, payload) => mutation.mutateAsync({ action, payload }),
  };
}

export function useQueueReportAction(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action, payload }) => {
      const request = actions[action];
      if (!request) throw new Error('Aksi laporan tidak tersedia');
      return request(reportId, payload);
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards', slug, 'queue'] }),
        queryClient.invalidateQueries({ queryKey: ['reports', variables.reportId] }),
      ]);
    },
  });
}
