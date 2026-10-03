import { cn } from '../../lib/cn.js';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?')[0];
  return letters.toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('rounded-full object-cover', sizeClass, className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        sizeClass,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
