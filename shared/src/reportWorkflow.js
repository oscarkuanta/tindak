export const REPORT_TRANSITIONS = Object.freeze({
  NEW: Object.freeze(['IN_PROGRESS', 'NEED_INFO', 'REJECTED', 'DUPLICATE']),
  NEED_INFO: Object.freeze(['NEW', 'REJECTED']),
  IN_PROGRESS: Object.freeze(['AWAITING_CONFIRMATION', 'REJECTED', 'DUPLICATE']),
  AWAITING_CONFIRMATION: Object.freeze(['RESOLVED', 'REOPENED']),
  REOPENED: Object.freeze(['IN_PROGRESS', 'AWAITING_CONFIRMATION']),
  RESOLVED: Object.freeze([]),
  REJECTED: Object.freeze([]),
  DUPLICATE: Object.freeze([]),
});

export const REPORT_REOPEN_LIMIT = 2;
export const AUTO_CONFIRM_AFTER_DAYS = 3;
export const BOARD_INACTIVE_AFTER_DAYS = 30;

export function canTransition(from, to) {
  return Boolean(REPORT_TRANSITIONS[from]?.includes(to));
}

const HANDLER_ACTION_TARGETS = Object.freeze({
  PROCESS: 'IN_PROGRESS',
  REQUEST_INFO: 'NEED_INFO',
  RESOLVE: 'AWAITING_CONFIRMATION',
  REJECT: 'REJECTED',
  DUPLICATE: 'DUPLICATE',
});

export function reportAllowedActions(
  { status, hasPendingInfoRequest = false },
  { isHandler = false, isReporter = false } = {},
) {
  const actions = [];
  if (isHandler) {
    for (const [action, target] of Object.entries(HANDLER_ACTION_TARGETS)) {
      if (canTransition(status, target)) actions.push(action);
    }
  }
  if (isReporter) {
    if (status === 'NEED_INFO' && hasPendingInfoRequest) actions.push('ANSWER_INFO');
    if (status === 'AWAITING_CONFIRMATION') actions.push('CONFIRM');
  }
  return actions;
}
