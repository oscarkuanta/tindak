import { PASSWORD_MIN_LENGTH } from '@tindak/shared';
import { cn } from '../../lib/cn.js';

const RULES = [
  {
    label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { label: 'Mengandung huruf', test: (v) => /\p{L}/u.test(v) },
  { label: 'Mengandung angka', test: (v) => /\p{N}/u.test(v) },
];

export function PasswordChecklist({ value, id }) {
  return (
    <ul id={id} className="flex flex-col gap-1 text-xs" aria-label="Syarat password">
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn('flex items-center gap-2', passed ? 'text-success' : 'text-text-muted')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-4 items-center justify-center rounded-full border text-[10px]',
                passed ? 'border-success bg-success text-brand-contrast' : 'border-border',
              )}
            >
              {passed ? '✓' : ''}
            </span>
            {rule.label}
            <span className="sr-only">{passed ? '(terpenuhi)' : '(belum terpenuhi)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
