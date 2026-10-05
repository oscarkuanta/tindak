import { REPORT_HANDLING_STATUS_LABELS } from '@tindak/shared';
import { Badge } from '../ui/index.js';

const TONES = {
  NEW: 'info',
  NEED_INFO: 'warning',
  IN_PROGRESS: 'brand',
  AWAITING_CONFIRMATION: 'warning',
  RESOLVED: 'success',
  REOPENED: 'danger',
  REJECTED: 'danger',
  DUPLICATE: 'neutral',
};

export function ReportStatusBadge({ status }) {
  return (
    <Badge tone={TONES[status] ?? 'neutral'}>
      {REPORT_HANDLING_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
