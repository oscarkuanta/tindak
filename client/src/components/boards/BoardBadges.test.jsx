import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BoardCard } from './BoardCard.jsx';
import { CommunityBadge, OfficialBadge, ScopeBadge, TrustBadge } from './BoardBadges.jsx';

describe('Badge Board', () => {
  it('membedakan status Official dari Komunitas dan trust label', () => {
    render(
      <MemoryRouter>
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
