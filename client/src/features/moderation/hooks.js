import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as moderationApi from './api.js';

export const adminKey = (...parts) => ['admin', ...parts];

function useAdminQuery(name, request, params) {
  return useQuery({
    queryKey: adminKey(name, params),
    queryFn: () => request(params),
    placeholderData: keepPreviousData,
  });
}

export const useAdminStats = () => useAdminQuery('stats', moderationApi.getAdminStats, {});
export const useModerationQueue = (params) =>
  useAdminQuery('moderation', moderationApi.getModerationQueue, params);
export const useBans = (params) => useAdminQuery('bans', moderationApi.getBans, params);
export const useAdminBoards = (params) =>
  useAdminQuery('boards', moderationApi.getAdminBoards, params);
export const useAdminUsers = (params) =>
  useAdminQuery('users', moderationApi.getAdminUsers, params);
export const useAuditLogs = (params) => useAdminQuery('audit', moderationApi.getAuditLogs, params);

export function useCreateFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moderationApi.createFlag,
    onSuccess: async (result) => {
      if (result.data?.hidden) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['reports'] }),
          queryClient.invalidateQueries({ queryKey: ['boards'] }),
          queryClient.invalidateQueries({ queryKey: ['feed'] }),
        ]);
      }
    },
  });
}

export function useAdminAction(request) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
      ]);
    },
  });
}

export const useRestoreReport = () =>
  useAdminAction(({ id, ...payload }) => moderationApi.restoreReport(id, payload));
export const useRemoveReport = () =>
  useAdminAction(({ id, ...payload }) => moderationApi.removeReport(id, payload));
export const useCreateBan = () => useAdminAction(moderationApi.createBan);
export const useRevokeBan = () => useAdminAction(moderationApi.revokeBan);
export const useFreezeBoard = () =>
  useAdminAction(({ slug, ...payload }) => moderationApi.freezeBoard(slug, payload));
export const useUnfreezeBoard = () => useAdminAction(moderationApi.unfreezeBoard);
export const useDismissBoardFlags = () =>
  useAdminAction(({ slug, ...payload }) => moderationApi.dismissBoardFlags(slug, payload));
