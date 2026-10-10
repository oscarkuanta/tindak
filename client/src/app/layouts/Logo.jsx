import { Link } from 'react-router';
import { cn } from '../../lib/cn.js';
import { TindakLogo } from '../../components/icons/BrandAssets.jsx';

const TONES = { light: 'text-surface', brand: 'text-brand' };

export function Logo({ className, tone = 'light' }) {
  return (
    <Link
      to="/"
      aria-label="T!ndak, ke Beranda"
      className={cn('brand-link shrink-0', TONES[tone], className)}
    >
      <TindakLogo className="brand-logo" />
    </Link>
  );
}
