import { cn } from '../../lib/cn.js';

const VARIANTS = {
  primary: 'bg-brand text-brand-contrast shadow-sm hover:bg-brand-hover hover:-translate-y-0.5',
  secondary:
    'border border-border bg-surface text-text shadow-sm hover:border-brand/40 hover:bg-brand-soft',
  white: 'bg-surface text-mint-700 shadow-sm hover:bg-mint-50',
  ghost: 'text-text hover:bg-surface-muted',
  danger: 'bg-danger text-danger-contrast hover:opacity-90',
  accent:
    'bg-surface font-extrabold text-mint-700 shadow-md ring-2 ring-surface/50 ring-offset-2 ring-offset-mint-800 hover:-translate-y-0.5 hover:bg-mint-50',
  outlineLight: 'border border-surface/70 text-surface hover:bg-surface/15',
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
