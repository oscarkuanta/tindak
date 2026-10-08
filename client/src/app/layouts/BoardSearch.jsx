import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';
import { TrustBadge, VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { useBoardSearch } from '../../features/boards/hooks.js';

export function BoardSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const searching = debouncedQuery.length >= 2;
  const searchQuery = useBoardSearch(
    { q: searching ? debouncedQuery : '', page: 1, pageSize: 5 },
    { enabled: open },
  );
  const suggestions = (searchQuery.data?.data ?? []).slice(0, 5);
  const optionCount = suggestions.length + 1;
  const showPanel = open && (searching || searchQuery.isPending || suggestions.length > 0);
  const viewAllPath = searching ? `/cari?q=${encodeURIComponent(query.trim())}` : '/cari';

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  function viewAll() {
    setOpen(false);
    navigate(viewAllPath);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' && optionCount) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % optionCount);
    }
    if (event.key === 'ArrowUp' && optionCount) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      if (activeIndex < suggestions.length) {
        setOpen(false);
        navigate(`/b/${suggestions[activeIndex].slug}`);
      } else {
        viewAll();
      }
      return;
    }
    if (event.key === 'Enter' && open && query.trim().length >= 2) {
      event.preventDefault();
      viewAll();
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="header-board-search">
        Cari Board
      </label>
      <MagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-text-subtle"
        size={18}
        weight="bold"
        aria-hidden="true"
      />
      <input
        id="header-board-search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="header-board-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `board-suggestion-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Cari Board..."
        className="h-11 w-full rounded-full border-0 bg-surface py-2 pr-4 pl-11 text-sm text-text outline-none transition placeholder:text-text-subtle focus:bg-surface focus:ring-2 focus:ring-mint/35"
      />
      {showPanel && (
        <div
          id="header-board-suggestions"
          role="listbox"
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-card border border-border bg-surface p-1 shadow-card"
        >
          {!searching && suggestions.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Board terpopuler
            </p>
          )}
          {searchQuery.isPending ? (
            <p className="px-3 py-3 text-sm text-text-muted">Mencari Board...</p>
          ) : (
            suggestions.map((board, index) => (
              <button
                key={board.id}
                id={`board-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false);
                  navigate(`/b/${board.slug}`);
                }}
                className={`block w-full rounded-base px-3 py-2 text-left ${activeIndex === index ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}
              >
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {board.name}
                  <VerificationBadge verification={board.verification} />
                  <TrustBadge label={board.trustLabel} score={board.trustScore} />
                </span>
                <span className="text-xs text-text-muted">{board.city}</span>
              </button>
            ))
          )}
          {searchQuery.isError && (
            <p role="status" className="px-3 py-2 text-xs text-text-muted">
              Saran belum tersedia. Coba lihat semua hasil.
            </p>
          )}
          <button
            id={`board-suggestion-${suggestions.length}`}
            type="button"
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            onClick={viewAll}
            className={`w-full border-t border-border px-3 py-3 text-left text-sm font-medium text-brand ${activeIndex === suggestions.length ? 'bg-brand-soft' : 'hover:bg-brand-soft'}`}
          >
            {searching ? `Lihat semua hasil untuk “${debouncedQuery}”` : 'Lihat semua Board'}
          </button>
        </div>
      )}
    </div>
  );
}
