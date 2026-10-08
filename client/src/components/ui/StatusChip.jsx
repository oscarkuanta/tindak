import { ClockCountdown } from '@phosphor-icons/react';
import { REPORT_HANDLING_STATUS_LABELS } from '@tindak/shared';
import { cn } from '../../lib/cn.js';

const STATUS_CLASSES = {
  NEW: 'status-chip--new',
  NEED_INFO: 'status-chip--need-info',
  IN_PROGRESS: 'status-chip--in-progress',
  AWAITING_CONFIRMATION: 'status-chip--awaiting',
  RESOLVED: 'status-chip--resolved',
  REOPENED: 'status-chip--reopened',
  REJECTED: 'status-chip--rejected',
  DUPLICATE: 'status-chip--duplicate',
};

export function StatusChip({ status, className }) {
  return (
    <span
      className={cn('status-chip', STATUS_CLASSES[status] ?? 'status-chip--duplicate', className)}
    >
      {REPORT_HANDLING_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function LateChip({ className }) {
  return (
    <span className={cn('late-chip', className)}>
      <ClockCountdown aria-hidden="true" size={13} weight="bold" />
      Terlambat
    </span>
  );
}
