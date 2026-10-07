function patchItem(item, payload) {
  if (!item || typeof item !== 'object' || item.id !== payload.id) return item;
  return {
    ...item,
    status: payload.status,
    supportCount: payload.supportCount,
    reactionCounts: payload.reactionCounts,
  };
}

export function patchReportData(value, payload) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value.pages)) {
    return { ...value, pages: value.pages.map((page) => patchReportData(page, payload)) };
  }
  if (Array.isArray(value.data)) {
    return { ...value, data: value.data.map((item) => patchItem(item, payload)) };
  }
  if (value.data?.id === payload.id) return { ...value, data: patchItem(value.data, payload) };
  return value;
}

const LIST_ROOTS = new Set(['boards', 'feed', 'me']);

export function applyReportUpdated(queryClient, payload) {
  queryClient.setQueriesData({ predicate: (query) => LIST_ROOTS.has(query.queryKey[0]) }, (value) =>
    patchReportData(value, payload),
  );
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [root, key] = query.queryKey;
      if (root !== 'reports') return false;
      if (String(key) === String(payload.id)) return true;
      return key === 'track' && query.state.data?.data?.id === payload.id;
    },
  });
}

export function applyReportCreated(queryClient, payload) {
  queryClient.invalidateQueries({ queryKey: ['boards', payload.boardSlug, 'reports'] });
  queryClient.invalidateQueries({ queryKey: ['boards', payload.boardSlug, 'queue'] });
  queryClient.invalidateQueries({ queryKey: ['feed'] });
}

export function applyQueueUpdated(queryClient, payload) {
  queryClient.invalidateQueries({ queryKey: ['boards', payload.boardSlug, 'queue'] });
}

export function applyBoardUpdated(queryClient, payload) {
  queryClient.setQueryData(['boards', payload.slug], (value) =>
    value?.data
      ? {
          ...value,
          data: {
            ...value.data,
            verification: payload.verification,
            verifiedAt: payload.verifiedAt,
            status: payload.status,
          },
        }
      : value,
  );
  queryClient.invalidateQueries({ queryKey: ['boards', payload.slug] });
}

export function applyNotification(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}
