import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as trustApi from './api.js';

export const myRatingKey = (slug) => ['boards', slug, 'rating', 'me'];
export const ratingSummaryKey = (slug) => ['boards', slug, 'rating', 'summary'];
export const boardAdminKey = (...parts) => ['board-admin', ...parts];

export function useMyRating(slug, { enabled = true } = {}) {
  return useQuery({
    queryKey: myRatingKey(slug),
    queryFn: () => trustApi.getMyRating(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function useRatingSummary(slug) {
  return useQuery({
    queryKey: ratingSummaryKey(slug),
    queryFn: () => trustApi.getRatingSummary(slug),
    enabled: Boolean(slug),
  });
}

export function useRateBoard(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => trustApi.rateBoard(slug, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
        queryClient.invalidateQueries({ queryKey: boardAdminKey() }),
      ]);
    },
  });
}

export function useBoardAdminStats() {
  return useQuery({ queryKey: boardAdminKey('stats'), queryFn: trustApi.getBoardAdminStats });
}

export function useCandidates(params) {
  return useQuery({
    queryKey: boardAdminKey('candidates', params),
    queryFn: () => trustApi.getCandidates(params),
    placeholderData: keepPreviousData,
  });
}

export function useOfficialBoards(params) {
  return useQuery({
    queryKey: boardAdminKey('official', params),
    queryFn: () => trustApi.getOfficialBoards(params),
    placeholderData: keepPreviousData,
  });
}

export function useVerificationDetail(slug) {
  return useQuery({
    queryKey: boardAdminKey('board', slug),
    queryFn: () => trustApi.getVerificationDetail(slug),
    enabled: Boolean(slug),
  });
}

function useVerificationAction(request) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...payload }) => request(slug, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardAdminKey() }),
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
      ]);
    },
  });
}

export const useVerifyBoard = () => useVerificationAction(trustApi.verifyBoard);
export const useSkipBoard = () => useVerificationAction(trustApi.skipBoard);
export const useRevokeVerification = () => useVerificationAction(trustApi.revokeVerification);
