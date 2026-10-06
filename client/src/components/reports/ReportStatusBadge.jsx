import { REPORT_SEVERITY_LABELS, REPORT_STATUS_LABELS } from '@tindak/shared';

const severityStyle = {
  LOW: 'bg-surface-muted text-text-muted',
  MEDIUM: 'bg-warning/10 text-text',
  DANGEROUS: 'bg-danger/10 text-danger',
};

const statusStyle = {
  NEW: 'bg-accent-soft text-accent',
  NEED_INFO: 'bg-warning/10 text-text',
  IN_PROGRESS: 'bg-accent-soft text-accent',
  AWAITING_CONFIRMATION: 'bg-warning/10 text-text',
  RESOLVED: 'bg-success/10 text-success',
  REOPENED: 'bg-warning/10 text-text',
  REJECTED: 'bg-danger/10 text-danger',
  DUPLICATE: 'bg-surface-muted text-text-muted',
};

export function ReportSeverityBadge({ severity }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyle[severity] ?? severityStyle.LOW}`}
    >
      {REPORT_SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}

export function ReportStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[status] ?? statusStyle.NEW}`}
    >
      {REPORT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
