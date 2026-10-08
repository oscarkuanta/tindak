import { REPORT_SEVERITY_LABELS } from '@tindak/shared';
import { cn } from '../../lib/cn.js';

const SEVERITY_CLASSES = {
  LOW: 'severity-chip--low',
  MEDIUM: 'severity-chip--medium',
  DANGEROUS: 'severity-chip--dangerous',
};

export function SeverityChip({ severity, className }) {
  return (
    <span
      className={cn('severity-chip', SEVERITY_CLASSES[severity] ?? 'severity-chip--low', className)}
    >
      {REPORT_SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}
