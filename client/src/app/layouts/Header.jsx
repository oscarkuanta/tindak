import { Link } from 'react-router';

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-header border-b border-border bg-surface">
      <div className="mx-auto flex h-full w-full max-w-layout items-center gap-4 px-4">
        <Link to="/" className="shrink-0 text-xl font-extrabold tracking-tight text-text">
          T<span className="text-brand">!</span>indak
        </Link>
        <div className="flex min-w-0 flex-1 justify-center" data-slot="search" />
        <div className="flex shrink-0 items-center gap-2" data-slot="actions" />
      </div>
    </header>
  );
}
