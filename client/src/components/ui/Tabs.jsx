import { cn } from '../../lib/cn.js';

export function Tabs({ items, value, onChange, label, className }) {
  return (
    <div role="tablist" aria-label={label} className={cn('tabs-pill', className)}>
      {items.map((item) => {
        const itemValue = item.value ?? item.id ?? item.key;
        return (
          <button
            key={itemValue}
            type="button"
            role="tab"
            aria-selected={value === itemValue}
            onClick={() => onChange(itemValue, item)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
