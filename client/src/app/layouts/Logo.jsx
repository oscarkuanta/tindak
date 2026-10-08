import { Link } from 'react-router';
import { cn } from '../../lib/cn.js';

export function Logo({ className }) {
  return (
    <Link
      to="/"
      aria-label="T!indak, ke Beranda"
      className={cn('brand-link shrink-0 text-surface', className)}
    >
      <span className="brand-wordmark">
        T<span className="brand-mark">!</span>INDAK
      </span>
    </Link>
  );
}
