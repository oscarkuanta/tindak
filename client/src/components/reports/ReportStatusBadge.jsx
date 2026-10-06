import { REPORT_HANDLING_STATUS_LABELS, REPORT_SEVERITY_LABELS } from '@tindak/shared';
import { Badge } from '../ui/index.js';

const STATUS_TONES = {
  NEW: 'info',
  NEED_INFO: 'warning',
  IN_PROGRESS: 'brand',
  AWAITING_CONFIRMATION: 'warning',
  RESOLVED: 'success',
  REOPENED: 'danger',
  REJECTED: 'danger',
  DUPLICATE: 'neutral',
};

const SEVERITY_TONES = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  DANGEROUS: 'danger',
};

export function ReportSeverityBadge({ severity }) {
  return (
    <Badge tone={SEVERITY_TONES[severity] ?? 'neutral'}>
      {REPORT_SEVERITY_LABELS[severity] ?? severity}
    </Badge>
  );
}

export function ReportStatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'}>
      {REPORT_HANDLING_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
