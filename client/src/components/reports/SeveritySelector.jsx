import {
  REPORT_SEVERITIES,
  REPORT_SEVERITY_DESCRIPTIONS,
  REPORT_SEVERITY_LABELS,
} from '@tindak/shared';

const severityStyle = {
  LOW: 'border-border bg-surface-muted text-text',
  MEDIUM: 'border-warning/40 bg-warning/10 text-text',
  DANGEROUS: 'border-danger/40 bg-danger/10 text-danger',
};

export function SeveritySelector({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Tingkat bahaya</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {REPORT_SEVERITIES.map((severity) => (
          <label
            key={severity}
            className={`flex min-h-24 cursor-pointer gap-3 rounded-card border p-3 transition hover:border-brand ${severityStyle[severity]} ${value === severity ? 'ring-2 ring-brand' : ''}`}
          >
            <input
              type="radio"
              name="severity"
              value={severity}
              checked={value === severity}
              onChange={() => onChange(severity)}
              className="mt-1 accent-brand"
            />
            <span>
              <span className="block text-sm font-semibold">
                {REPORT_SEVERITY_LABELS[severity]}
              </span>
              <span className="mt-1 block text-xs text-text-muted">
                {REPORT_SEVERITY_DESCRIPTIONS[severity]}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
