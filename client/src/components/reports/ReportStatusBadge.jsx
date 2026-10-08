import { LateChip, SeverityChip, StatusChip } from '../ui/index.js';

export function ReportSeverityBadge({ severity }) {
  return <SeverityChip severity={severity} />;
}

export function ReportStatusBadge({ status }) {
  return <StatusChip status={status} />;
}

export { LateChip };
