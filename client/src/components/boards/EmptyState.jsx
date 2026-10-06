export function EmptyState({ title, description, action, className = '' }) {
  return (
    <div
      className={`rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center ${className}`}
    >
      <h2 className="font-semibold text-text">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
