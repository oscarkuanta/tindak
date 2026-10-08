import { Link } from 'react-router';
import { cn } from '../../lib/cn.js';
import { BrandMark } from '../../components/icons/BrandAssets.jsx';

const TONES = { light: 'text-surface', brand: 'text-mint-600' };

export function Logo({ className, tone = 'light' }) {
  return (
    <Link
      to="/"
      aria-label="T!indak, ke Beranda"
      className={cn('brand-link shrink-0', TONES[tone], className)}
    >
      <span className="brand-wordmark" aria-hidden="true">
        <span>T</span>
        <BrandMark className="brand-wordmark__symbol" />
        <span>NDAK</span>
      </span>
    </Link>
  );
}
