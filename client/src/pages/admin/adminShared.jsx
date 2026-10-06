import { Alert, Button, Spinner } from '../../components/ui/index.js';

export function QueryState({ query, empty, children }) {
  if (query.isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spinner label="Memuat data" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Alert>
        {query.error.message}{' '}
        <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>
          Coba lagi
        </button>
      </Alert>
    );
  }
  if (!query.data.data?.length && empty) {
    return <p className="py-8 text-center text-sm text-text-muted">{empty}</p>;
  }
  return children(query.data.data, query.data.meta);
}

export function Pager({ meta, page, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Sebelumnya
      </Button>
      <span className="text-text-muted">
        Halaman {page} dari {meta.totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= meta.totalPages}
        onClick={() => onPage(page + 1)}
      >
        Berikutnya
      </Button>
    </div>
  );
}
