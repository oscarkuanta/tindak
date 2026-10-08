import {
  REPORT_SEVERITIES,
  REPORT_SEVERITY_DESCRIPTIONS,
  REPORT_SEVERITY_LABELS,
} from '@tindak/shared';
import { cn } from '../../lib/cn.js';
import { SeverityIcon } from '../icons/AppIcons.jsx';

const OPTION_CLASS = {
  LOW: 'severity-option--low',
  MEDIUM: 'severity-option--medium',
  DANGEROUS: 'severity-option--dangerous',
};

export function SeveritySelector({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Tingkat bahaya</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {REPORT_SEVERITIES.map((severity) => (
          <label
            key={severity}
            className={cn(
              'severity-option',
              OPTION_CLASS[severity],
              value === severity && 'is-selected',
            )}
          >
            <input
              type="radio"
              name="severity"
              value={severity}
              checked={value === severity}
              onChange={() => onChange(severity)}
              className="sr-only"
            />
            <span className="severity-option__icon">
              <SeverityIcon severity={severity} size={26} className="!text-current" />
            </span>
            <span className="block text-sm font-semibold">{REPORT_SEVERITY_LABELS[severity]}</span>
            <span className="block text-xs text-text-muted">
              {REPORT_SEVERITY_DESCRIPTIONS[severity]}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
