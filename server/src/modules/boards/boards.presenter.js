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

export function toViewer(user, { follow, membership } = {}) {
  if (!user) return null;
  return {
    isFollowing: Boolean(follow),
    notifyLevel: follow?.notifyLevel ?? null,
    role: membership?.role ?? null,
  };
}

export function toBoardCard(
  board,
  { followerCount = 0, activeReportCount = 0, viewer = null } = {},
) {
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
    followerCount,
    activeReportCount,
    createdAt: board.createdAt,
    viewer,
  };
}

export function toBoardDetail(board, { handlerCount, followerCount, activeReportCount, viewer }) {
  return {
    ...toBoardCard(board, { followerCount, activeReportCount, viewer }),
    managerTitle: board.managerTitle,
    description: board.description,
    dangerousTargetHours: board.dangerousTargetHours,
    ratingCount: 0,
    responseRate: 0,
    rejectedPercentage: 0,
    handlerCount,
    isInactive: board.status === 'INACTIVE',
    restoredByAdminCount: board.restoredByAdminCount ?? 0,
    owner: board.owner
      ? { id: board.owner.id, name: board.owner.name, avatarUrl: board.owner.avatarUrl }
      : null,
    categories: (board.categories ?? []).map(toCategory),
  };
}
