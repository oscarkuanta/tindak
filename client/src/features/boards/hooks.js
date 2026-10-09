import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBoard,
  createBoardCategory,
  deleteBoardCategory,
  getBoard,
  getBoardHandlers,
  getCities,
  getMyFollows,
  getMyBoards,
  getSimilarBoards,
  followBoard,
  inviteBoardHandler,
  searchHandlerCandidates,
  renameBoardCategory,
  removeBoardHandler,
  reorderBoardCategories,
  searchBoards,
  transferBoardOwnership,
  unfollowBoard,
  updateFollowNotifyLevel,
  updateBoard,
} from './api.js';

export const boardSearchKey = (params) => ['boards', 'search', params];
export const boardKey = (slug) => ['boards', slug];
export const myBoardsKey = ['me', 'boards'];
export const myFollowsKey = ['me', 'follows'];
export const citiesKey = ['meta', 'cities'];
export const boardHandlersKey = (slug) => ['boards', slug, 'handlers'];

export function useBoardSearch(params, options = {}) {
  return useQuery({
    queryKey: boardSearchKey(params),
    queryFn: () => searchBoards(params),
    enabled: options.enabled ?? true,
  });
}

export function useBoard(slug) {
  return useQuery({
    queryKey: boardKey(slug),
    queryFn: () => getBoard(slug),
    enabled: Boolean(slug),
  });
}

export function useBoardSimilar(params, options = {}) {
  return useQuery({
    queryKey: ['boards', 'similar', params],
    queryFn: () => getSimilarBoards(params),
    enabled: Boolean(params?.name && params?.city) && (options.enabled ?? true),
  });
}

export function useCities() {
  return useQuery({ queryKey: citiesKey, queryFn: getCities, staleTime: 60 * 60_000 });
}

export function useMyBoards(options = {}) {
  return useQuery({
    queryKey: myBoardsKey,
    queryFn: getMyBoards,
    enabled: options.enabled ?? true,
  });
}

export function useMyFollows(options = {}) {
  return useQuery({
    queryKey: myFollowsKey,
    queryFn: getMyFollows,
    enabled: options.enabled ?? true,
  });
}

export function useBoardHandlers(slug, options = {}) {
  return useQuery({
    queryKey: boardHandlersKey(slug),
    queryFn: () => getBoardHandlers(slug),
    enabled: Boolean(slug) && (options.enabled ?? true),
  });
}

function useInvalidateBoards() {
  const queryClient = useQueryClient();
  return async (slug) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['boards'] }),
      queryClient.invalidateQueries({ queryKey: myBoardsKey }),
      queryClient.invalidateQueries({ queryKey: myFollowsKey }),
      ...(slug ? [queryClient.invalidateQueries({ queryKey: boardKey(slug) })] : []),
    ]);
  };
}

function withFollowing(board, following, notifyLevel) {
  if (!board) return board;
  const currentlyFollowing = board.viewer?.isFollowing ?? board.isFollowing ?? false;
  const followerCount = Math.max(
    0,
    (board.followerCount ?? 0) + Number(following) - Number(currentlyFollowing),
  );
  const viewer = board.viewer
    ? { ...board.viewer, isFollowing: following, notifyLevel: following ? notifyLevel : null }
    : board.viewer;
  return {
    ...board,
    followerCount,
    ...(Object.hasOwn(board, 'isFollowing') ? { isFollowing: following } : {}),
    ...(Object.hasOwn(board, 'notifyLevel') ? { notifyLevel: following ? notifyLevel : null } : {}),
    ...(viewer ? { viewer } : {}),
  };
}

function updateBoardQueryData(queryClient, slug, updater) {
  const queries = queryClient.getQueriesData({ queryKey: ['boards'] });
  for (const [queryKey, response] of queries) {
    if (!response?.data) continue;
    if (queryKey[1] === slug && !Array.isArray(response.data)) {
      queryClient.setQueryData(queryKey, { ...response, data: updater(response.data) });
      continue;
    }
    if ((queryKey[1] === 'search' || queryKey[1] === 'similar') && Array.isArray(response.data)) {
      queryClient.setQueryData(queryKey, {
        ...response,
        data: response.data.map((board) => (board.slug === slug ? updater(board) : board)),
      });
    }
  }
  return queries;
}

function updateFollowList(queryClient, slug, following, board, notifyLevel) {
  const current = queryClient.getQueryData(myFollowsKey);
  if (!current || !Array.isArray(current.data)) return current;
  const data = current.data.filter((item) => item.board?.slug !== slug);
  if (following) {
    const existing = current.data.find((item) => item.board?.slug === slug);
    data.push({
      ...(existing ?? {}),
      board: withFollowing(existing?.board ?? board, true, notifyLevel),
      notifyLevel,
    });
  }
  queryClient.setQueryData(myFollowsKey, { ...current, data });
  return current;
}

export function useFollowBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, following }) => (following ? followBoard(slug) : unfollowBoard(slug)),
    onMutate: async ({ slug, following, board, notifyLevel = 'ALL' }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['boards'] }),
        queryClient.cancelQueries({ queryKey: myFollowsKey }),
      ]);
      const boardQueries = updateBoardQueryData(queryClient, slug, (item) =>
        withFollowing(item, following, notifyLevel),
      );
      const follows = queryClient.getQueryData(myFollowsKey);
      updateFollowList(queryClient, slug, following, board, notifyLevel);
      return { boardQueries, follows };
    },
    onError: (_error, _variables, context) => {
      context?.boardQueries?.forEach(([queryKey, value]) =>
        queryClient.setQueryData(queryKey, value),
      );
      if (context?.follows) queryClient.setQueryData(myFollowsKey, context.follows);
    },
    onSettled: async (_data, _error, { slug }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
        queryClient.invalidateQueries({ queryKey: myFollowsKey }),
        queryClient.invalidateQueries({ queryKey: boardKey(slug) }),
      ]);
    },
  });
}

export function useUpdateFollowNotifyLevel(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notifyLevel) => updateFollowNotifyLevel(slug, { notifyLevel }),
    onMutate: async (notifyLevel) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['boards'] }),
        queryClient.cancelQueries({ queryKey: myFollowsKey }),
      ]);
      const boardQueries = updateBoardQueryData(queryClient, slug, (board) => ({
        ...board,
        ...(board.viewer ? { viewer: { ...board.viewer, notifyLevel } } : {}),
        ...(Object.hasOwn(board, 'notifyLevel') ? { notifyLevel } : {}),
      }));
      const follows = queryClient.getQueryData(myFollowsKey);
      if (follows?.data) {
        queryClient.setQueryData(myFollowsKey, {
          ...follows,
          data: follows.data.map((item) =>
            item.board?.slug === slug ? { ...item, notifyLevel } : item,
          ),
        });
      }
      return { boardQueries, follows };
    },
    onError: (_error, _notifyLevel, context) => {
      context?.boardQueries?.forEach(([queryKey, value]) =>
        queryClient.setQueryData(queryKey, value),
      );
      if (context?.follows) queryClient.setQueryData(myFollowsKey, context.follows);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKey(slug) }),
        queryClient.invalidateQueries({ queryKey: myFollowsKey }),
      ]),
  });
}

export function useInviteBoardHandler(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteBoardHandler.bind(null, slug),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardHandlersKey(slug) }),
        queryClient.invalidateQueries({ queryKey: boardKey(slug) }),
      ]);
    },
  });
}

export function useRemoveBoardHandler(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => removeBoardHandler(slug, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardHandlersKey(slug) }),
        queryClient.invalidateQueries({ queryKey: boardKey(slug) }),
      ]);
    },
  });
}

export function useTransferBoardOwnership(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => transferBoardOwnership(slug, { userId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
        queryClient.invalidateQueries({ queryKey: myBoardsKey }),
        queryClient.invalidateQueries({ queryKey: myFollowsKey }),
        queryClient.invalidateQueries({ queryKey: boardHandlersKey(slug) }),
      ]);
    },
  });
}

export function useCreateBoard() {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBoard(slug) {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: (payload) => updateBoard(slug, payload),
    onSuccess: () => invalidate(slug),
  });
}

export function useCreateBoardCategory(slug) {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: createBoardCategory.bind(null, slug),
    onSuccess: () => invalidate(slug),
  });
}

export function useRenameBoardCategory(slug) {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: ({ id, name }) => renameBoardCategory(slug, id, { name }),
    onSuccess: () => invalidate(slug),
  });
}

export function useDeleteBoardCategory(slug) {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: (id) => deleteBoardCategory(slug, id),
    onSuccess: () => invalidate(slug),
  });
}

export function useReorderBoardCategories(slug) {
  const invalidate = useInvalidateBoards();
  return useMutation({
    mutationFn: (categoryIds) => reorderBoardCategories(slug, categoryIds),
    onSuccess: () => invalidate(slug),
  });
}

export function useHandlerCandidates(slug, q) {
  return useQuery({
    queryKey: ['boards', slug, 'handler-candidates', q],
    queryFn: () => searchHandlerCandidates(slug, q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
