import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Logo } from './Logo.jsx';

describe('Logo', () => {
  it('menampilkan wordmark T!NDAK dengan tanda seru SVG yang dapat mewarisi warna', () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'T!indak, ke Beranda' });
    const mark = screen.getByTestId('brand-mark');

    expect(link).toHaveAttribute('href', '/');
    expect(mark).toHaveAttribute('viewBox', '0 0 24 32');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });
});
