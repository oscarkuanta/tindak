const STATUSES_WITHOUT_DEADLINE = new Set([
  'AWAITING_CONFIRMATION',
  'RESOLVED',
  'REJECTED',
  'DUPLICATE',
]);
const REPORTER_NOT_SATISFIED_REOPENS = 2;

export const REPORT_LIST_INCLUDE = {
  board: { select: { id: true, slug: true, name: true, status: true } },
  category: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
  media: { orderBy: { id: 'asc' } },
};

export const REPORT_DETAIL_INCLUDE = {
  ...REPORT_LIST_INCLUDE,
  parent: { select: { id: true, title: true } },
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
    reporter: toReporter(report),
    title: report.title,
    description: report.description,
    locationDetail: report.locationDetail,
    severity: report.severity,
    status: report.status,
    media: report.media.map(toMedia),
    dueAt: report.dueAt,
    isOverdue: isOverdue(report),
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

export function toReportDetail(report, { isStaff = false } = {}) {
  return {
    ...toReport(report),
    ...(isStaff && { reporterType: report.userId ? 'ACCOUNT' : 'GUEST' }),
    reopenCount: report.reopenCount,
    reporterNotSatisfied: report.reopenCount >= REPORTER_NOT_SATISFIED_REOPENS,
    parent: report.parent ?? null,
    infoRequest: null,
    timeline: report.events.map((event) => toTimelineEntry(event, report)),
    allowedActions: [],
  };
}
