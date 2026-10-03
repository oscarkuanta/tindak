import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/router.jsx';

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function mockApi(handlers) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method ?? 'GET';
    const path = String(url).replace(/^\/api/, '');
    const handler = handlers[`${method} ${path.split('?')[0]}`];
    if (!handler) return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } });
    const [status, body] = await handler(options);
    return jsonResponse(status, body);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const guestMe = () => [
  401,
  { error: { code: 'UNAUTHENTICATED', message: 'Kamu belum masuk' } },
];

export function renderApp(initialPath) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}
