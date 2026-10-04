import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBoard,
  createBoardCategory,
  deleteBoardCategory,
  getBoard,
  getCities,
  getMyBoards,
  getSimilarBoards,
  renameBoardCategory,
  reorderBoardCategories,
  searchBoards,
  updateBoard,
} from './api.js';

export const boardSearchKey = (params) => ['boards', 'search', params];
export const boardKey = (slug) => ['boards', slug];
export const myBoardsKey = ['me', 'boards'];
export const citiesKey = ['meta', 'cities'];

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

export function useMyBoards() {
  return useQuery({ queryKey: myBoardsKey, queryFn: getMyBoards });
}

function useInvalidateBoards() {
  const queryClient = useQueryClient();
  return async (slug) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['boards'] }),
      queryClient.invalidateQueries({ queryKey: myBoardsKey }),
      ...(slug ? [queryClient.invalidateQueries({ queryKey: boardKey(slug) })] : []),
    ]);
  };
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
