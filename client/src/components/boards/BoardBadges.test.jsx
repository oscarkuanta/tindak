import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardCard } from './BoardCard.jsx';
import { CommunityBadge, OfficialBadge, ScopeBadge, TrustBadge } from './BoardBadges.jsx';
import { LoginPromptProvider } from '../../features/auth/LoginPromptProvider.jsx';
import { ToastProvider } from '../../features/boards/ToastProvider.jsx';

describe('Badge Board', () => {
  it('memakai centang Official sederhana berbentuk lingkaran', () => {
    render(<OfficialBadge />);

    const icon = screen.getByTestId('official-check-icon');

    expect(icon).toHaveAttribute('viewBox', '0 0 20 20');
    expect(icon.querySelector('circle')).toHaveAttribute('r', '10');
    expect(icon.querySelector('path')).toHaveAttribute('stroke', 'var(--surface)');
  });

  it('membedakan status Official dari Komunitas dan trust label', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPromptProvider>
            <ToastProvider>
              <div>
                <OfficialBadge />
                <CommunityBadge />
                <TrustBadge label="TRUSTED" />
                <ScopeBadge type="ROAD" />
                <BoardCard
                  board={{
                    id: 1,
                    slug: 'official',
                    name: 'Board Official',
                    city: 'Surabaya',
                    type: 'ROAD',
                    verification: 'OFFICIAL',
                  }}
                />
                <BoardCard
                  board={{
                    id: 2,
                    slug: 'community',
                    name: 'Board Komunitas',
                    city: 'Sidoarjo',
                    type: 'AREA',
                    verification: 'COMMUNITY',
                  }}
                />
              </div>
            </ToastProvider>
          </LoginPromptProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByLabelText('Official')).toHaveLength(2);
    expect(screen.getAllByText('Official')).toHaveLength(2);
    expect(screen.getAllByText('Komunitas')).toHaveLength(2);
    expect(screen.getByText('Terpercaya')).toBeInTheDocument();
    expect(screen.getAllByText('Jalan')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /Board Official Official Surabaya/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Board Komunitas Komunitas Sidoarjo/ }),
    ).toBeInTheDocument();
  });
});
