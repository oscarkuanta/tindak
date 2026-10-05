import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BeforeAfterSlider } from './BeforeAfterSlider.jsx';

describe('BeforeAfterSlider', () => {
  it('menampilkan foto sebelum, sesudah, dan kontrol geser', () => {
    render(
      <BeforeAfterSlider
        before={{ url: '/uploads/before.webp' }}
        after={{ url: '/uploads/after.webp' }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Foto sebelum penindakan' })).toHaveAttribute(
      'src',
      '/uploads/before.webp',
    );
    expect(screen.getByRole('img', { name: 'Foto sesudah penindakan' })).toHaveAttribute(
      'src',
      '/uploads/after.webp',
    );
    expect(
      screen.getByRole('slider', { name: 'Bandingkan foto sebelum dan sesudah' }),
    ).toBeInTheDocument();
  });
});
