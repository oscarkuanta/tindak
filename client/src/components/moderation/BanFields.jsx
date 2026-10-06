import {
  BAN_DURATION_LABELS,
  BAN_DURATIONS,
  BAN_TARGET_LABELS,
  IP_BAN_DURATIONS,
} from '@tindak/shared';
import { SELECT_CLASS, TEXTAREA_CLASS } from '../../pages/admin/adminFormat.js';

function banDurationsFor(targetType) {
  return targetType === 'IP' ? IP_BAN_DURATIONS : Object.keys(BAN_DURATIONS);
}

export function BanFields({ value, onChange, targets }) {
  const durations = banDurationsFor(value.targetType);
  function update(patch) {
    const next = { ...value, ...patch };
    if (!banDurationsFor(next.targetType).includes(next.duration)) next.duration = '1d';
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Target ban
          <select
            className={SELECT_CLASS}
            value={value.targetType}
            onChange={(event) => update({ targetType: event.target.value })}
          >
            {targets.map((target) => (
              <option key={target} value={target}>
                {BAN_TARGET_LABELS[target]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Durasi
          <select
            className={SELECT_CLASS}
            value={value.duration}
            onChange={(event) => update({ duration: event.target.value })}
          >
            {durations.map((duration) => (
              <option key={duration} value={duration}>
                {BAN_DURATION_LABELS[duration]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {value.targetType === 'IP' && (
        <p className="text-xs text-text-muted">
          Ban IP maksimal 7 hari karena satu IP bisa dipakai banyak orang.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Alasan ban
        <textarea
          rows={2}
          maxLength={500}
          className={TEXTAREA_CLASS}
          value={value.reason}
          onChange={(event) => update({ reason: event.target.value })}
        />
      </label>
    </div>
  );
}
