import { Link } from 'react-router';
import { cn } from '../../lib/cn.js';

export function Logo({ className }) {
  return (
    <Link
      to="/"
      aria-label="T!indak, ke Beranda"
      className={cn('shrink-0 text-xl font-extrabold tracking-tight text-text', className)}
    >
      T<span className="text-brand">!</span>indak
    </Link>
  );
}
