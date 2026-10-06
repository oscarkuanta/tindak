export function trustLabelFor(board) {
  return board.status === 'INACTIVE' ? 'INACTIVE' : 'NEW';
}

export function toCategory(category) {
  return {
    id: category.id,
    name: category.name,
    isDefault: category.isDefault,
    sortOrder: category.sortOrder,
  };
}

export function toBoardCard(board) {
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    city: board.city,
    type: board.type,
    verification: board.verification,
    verifiedAt: board.verifiedAt,
    coverImageUrl: board.coverImageUrl,
    status: board.status,
    trustScore: null,
    trustLabel: trustLabelFor(board),
    followerCount: 0,
    activeReportCount: 0,
    createdAt: board.createdAt,
  };
}

export function toBoardDetail(board, { handlerCount, membership, viewerLoggedIn }) {
  return {
    ...toBoardCard(board),
    managerTitle: board.managerTitle,
    description: board.description,
    dangerousTargetHours: board.dangerousTargetHours,
    ratingCount: 0,
    responseRate: 0,
    rejectedPercentage: 0,
    handlerCount,
    isInactive: board.status === 'INACTIVE',
    owner: board.owner
      ? { id: board.owner.id, name: board.owner.name, avatarUrl: board.owner.avatarUrl }
      : null,
    categories: (board.categories ?? []).map(toCategory),
    viewer: viewerLoggedIn
      ? { isFollowing: false, notifyLevel: null, role: membership?.role ?? null }
      : null,
  };
}
