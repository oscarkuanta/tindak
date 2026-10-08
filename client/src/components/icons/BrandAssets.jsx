export function BrandMark({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-testid="brand-mark"
      viewBox="0 0 24 32"
      fill="none"
      focusable="false"
    >
      <path
        d="M2.5 9h3M18.5 9h3M7.25 4.5l2 2M16.75 4.5l-2 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path d="M12 10v11" stroke="currentColor" strokeLinecap="round" strokeWidth="3.25" />
      <circle cx="12" cy="27" r="2.25" fill="currentColor" />
    </svg>
  );
}

export function OfficialCheckIcon({ size = 19 }) {
  return (
    <svg
      aria-hidden="true"
      data-testid="official-check-icon"
      className="verified-badge"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      focusable="false"
    >
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path
        d="m5.4 10.2 3.05 3.05 6.2-6.45"
        fill="none"
        stroke="var(--surface)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}
