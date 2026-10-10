import { useEffect, useMemo, useRef, useState } from 'react';
import { useCities } from '../../features/boards/hooks.js';

const EMPTY_CITIES = [];

export function CitySelect({ value, onChange, error, label = 'Kota', id = 'board-city' }) {
  const { data, isPending, error: loadError, refetch } = useCities();
  const [search, setSearch] = useState(value ?? '');
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    if (value) setSearch(value);
  }
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const cities = data?.data ?? EMPTY_CITIES;

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const filteredCities = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('id-ID');
    return cities
      .filter((city) => !normalized || city.name.toLocaleLowerCase('id-ID').includes(normalized))
      .slice(0, 12);
  }, [cities, search]);

  function selectCity(city) {
    setSearch(city.name);
    setOpen(false);
    onChange(city.name);
  }

  return (
    <div className="relative flex flex-col gap-1" ref={rootRef}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        value={search}
        onFocus={(event) => {
          event.target.select();
          setOpen(true);
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
          onChange('');
        }}
        placeholder="Cari kota..."
        className={`h-10 w-full rounded-base border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${error ? 'border-danger' : 'border-border'}`}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
      {loadError && (
        <p className="text-xs text-danger" role="alert">
          Kota belum dapat dimuat.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Coba lagi
          </button>
        </p>
      )}
      {open && !loadError && (
        <ul
          id={`${id}-options`}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-base border border-border bg-surface p-1 shadow-card"
        >
          {isPending ? (
            <li className="px-3 py-2 text-sm text-text-muted">Memuat daftar kota...</li>
          ) : filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <li key={`${city.province}-${city.name}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === city.name}
                  className="w-full rounded-base px-3 py-2 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                  onClick={() => selectCity(city)}
                >
                  <span className="block font-medium">{city.name}</span>
                  <span className="text-xs text-text-muted">{city.province}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-text-muted">
              {cities.length ? 'Kota tidak ditemukan.' : 'Daftar kota belum tersedia.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
