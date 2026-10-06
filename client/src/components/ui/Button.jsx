import { Link } from 'react-router';
import { cn } from '../../lib/cn.js';
import { buttonClasses } from './buttonStyles.js';

export function Button({
  variant,
  size,
  block,
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, block }), className)}
      {...props}
    >
      {loading ? 'Memproses...' : children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, className, ...props }) {
  return <Link className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}
