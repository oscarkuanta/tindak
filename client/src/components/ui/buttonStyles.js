import { cn } from '../../lib/cn.js';

const VARIANTS = {
  primary: 'bg-brand text-brand-contrast shadow-sm hover:bg-brand-hover hover:-translate-y-0.5',
  secondary:
    'border border-border bg-surface text-text shadow-sm hover:border-brand/40 hover:bg-brand-soft',
  white: 'bg-surface text-mint-700 shadow-sm hover:bg-mint-50',
  ghost: 'text-text hover:bg-surface-muted',
  danger: 'bg-danger text-danger-contrast hover:opacity-90',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClasses({ variant = 'primary', size = 'md', block = false } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-base font-semibold transition duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  );
}
