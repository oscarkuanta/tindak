import { RATING_QUICK_TAG_META, RATING_QUICK_TAGS } from '@tindak/shared';
import { QuickTagIcon, StarIcon } from '../icons/AppIcons.jsx';

export function StarDistribution({ distribution = {}, total }) {
  const count = total ?? Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return (
    <ul className="space-y-1" aria-label="Sebaran bintang">
      {[5, 4, 3, 2, 1].map((star) => {
        const value = distribution[star] ?? 0;
        const percent = count ? Math.round((value / count) * 100) : 0;
        return (
          <li key={star} className="flex items-center gap-2 text-xs">
            <span className="inline-flex w-9 shrink-0 items-center gap-0.5 text-text-muted">
              {star} <StarIcon size={12} />
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full bg-yellow"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-text-muted">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function QuickTagSummary({ quickTags = {} }) {
  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {RATING_QUICK_TAGS.map((tag) => (
        <li
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-text-muted"
        >
          <QuickTagIcon tag={tag} size={14} />
          {RATING_QUICK_TAG_META[tag].label}
          <span className="font-semibold text-text">{quickTags[tag] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
