import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Logo } from './Logo.jsx';

describe('Logo', () => {
  it('menampilkan logo T!ndak dari desain tim yang mewarisi warna teks', () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'T!ndak, ke Beranda' });
    const logo = screen.getByTestId('brand-logo');

    expect(link).toHaveAttribute('href', '/');
    expect(logo).toHaveAttribute('viewBox', '0 0 79 31');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});
