import { REPORT_LOCKED_STATUSES, reportAllowedActions } from '@tindak/shared';

export const STATUSES_WITHOUT_DEADLINE = new Set([
  'AWAITING_CONFIRMATION',
  'RESOLVED',
  'REJECTED',
  'DUPLICATE',
]);

export const REPORT_LIST_INCLUDE = {
  board: { select: { id: true, slug: true, name: true, status: true, verification: true } },
  category: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
  media: { orderBy: { id: 'asc' } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
};

export const REPORT_DETAIL_INCLUDE = {
  ...REPORT_LIST_INCLUDE,
  board: {
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      verification: true,
      owner: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  parent: { select: { id: true, title: true, status: true } },
  infoRequests: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
    include: { askedBy: { select: { id: true, name: true } } },
  },
  events: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { actor: { select: { id: true, name: true } } },
  },
};

function toMedia(media) {
  return {
    id: media.id,
    url: media.url,
    kind: media.kind,
    isBlurred: media.isBlurred,
    createdAt: media.createdAt,
  };
}

function toReporter(report) {
  if (report.isAnonymous || !report.user) return null;
  return { id: report.user.id, name: report.user.name, avatarUrl: report.user.avatarUrl };
}

export function isOverdue(report, now = new Date()) {
  return Boolean(
    report.dueAt && report.dueAt < now && !STATUSES_WITHOUT_DEADLINE.has(report.status),
  );
}

export function toReport(report) {
  return {
    id: report.id,
    board: report.board,
    category: report.category,
    isAnonymous: report.isAnonymous,
    isHidden: report.isHidden,
    reporter: toReporter(report),
    title: report.title,
    description: report.description,
    locationDetail: report.locationDetail,
    severity: report.severity,
    status: report.status,
    media: report.media.map(toMedia),
    assignee: report.assignee ?? null,
    dueAt: report.dueAt,
    isOverdue: isOverdue(report),
    supportCount: report.supportCount,
    reactionCounts: {
      DANGEROUS: report.dangerousCount,
      LONG_STANDING: report.longStandingCount,
      ANNOYING: report.annoyingCount,
    },
    priorityScore: report.priorityScore,
    isEngagementLocked: REPORT_LOCKED_STATUSES.includes(report.status),
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function toTimelineEntry(event, report) {
  const hideActor = event.actorType === 'REPORTER' && report.isAnonymous;
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorType: event.actorType,
    actor: hideActor || !event.actor ? null : event.actor,
    reason: event.reason,
    note: event.note,
    createdAt: event.createdAt,
  };
}

function toInfoRequest(infoRequest) {
  if (!infoRequest) return null;
  return {
    id: infoRequest.id,
    question: infoRequest.question,
    answer: infoRequest.answer,
    askedBy: infoRequest.askedBy,
    createdAt: infoRequest.createdAt,
    answeredAt: infoRequest.answeredAt,
  };
}

export function allowedActionsFor(report, viewer) {
  const latestInfo = report.infoRequests?.[0];
  return reportAllowedActions(
    { status: report.status, hasPendingInfoRequest: Boolean(latestInfo && !latestInfo.answer) },
    viewer,
  );
}

export function toQueueItem(report) {
  return {
    ...toReport(report),
    media: report.media.slice(0, 1).map(toMedia),
    allowedActions: allowedActionsFor(report, { isHandler: true }),
  };
}

export function toReportDetail(
  report,
  { isStaff = false, isHandler = false, isReporter = false } = {},
) {
  return {
    ...toReport(report),
    ...(isStaff && { reporterType: report.userId ? 'ACCOUNT' : 'GUEST' }),
    reopenCount: report.reopenCount,
    reporterNotSatisfied: report.reporterNotSatisfied,
    parent: report.parent ?? null,
    infoRequest: toInfoRequest(report.infoRequests?.[0]),
    timeline: report.events.map((event) => toTimelineEntry(event, report)),
    allowedActions: allowedActionsFor(report, { isHandler, isReporter }),
  };
}

export function toHiddenReport(report) {
  return {
    id: report.id,
    board: report.board ? { slug: report.board.slug, name: report.board.name } : null,
    isHidden: true,
    moderationNotice: 'Laporan ini sedang ditinjau moderator',
  };
}

export function withViewerEngagement(json, report, user, engagement) {
  const isOwnReport = Boolean(user && report.userId === user.id);
  return {
    ...json,
    mySupport: engagement.supports.has(report.id),
    myReaction: engagement.reactions.get(report.id) ?? null,
    isOwnReport,
    ...(isOwnReport && { trackingCode: report.trackingCode }),
  };
}
