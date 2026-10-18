import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubpageHero } from '../subpage-hero';
import { ClipboardList, Sparkles } from 'lucide-react';

describe('SubpageHero', () => {
  it('renders title and subtitle correctly', () => {
    render(
      <SubpageHero
        title="Jadwal Ujian"
        subtitle="Kelola dan publikasikan jadwal asesmen digital institusi."
      />,
    );

    expect(screen.getByText('Jadwal Ujian')).toBeTruthy();
    expect(
      screen.getByText('Kelola dan publikasikan jadwal asesmen digital institusi.'),
    ).toBeTruthy();
  });

  it('renders badges, action buttons, and stats metrics', () => {
    render(
      <SubpageHero
        title="Jadwal Ujian"
        subtitle="Kelola dan pantau ujian"
        icon={ClipboardList}
        badges={[
          { label: 'Assessia Engine v1.8.0', icon: Sparkles, variant: 'violet' },
          { label: '12 Ujian Aktif', variant: 'cyan' },
        ]}
        actions={
          <button data-testid="hero-action-btn">Tambah Ujian</button>
        }
        stats={[
          { label: 'Total Terjadwal', value: '42' },
          { label: 'Sedang Ujian', value: '5', accent: '#10B981' },
        ]}
      />,
    );

    expect(screen.getByText('Assessia Engine v1.8.0')).toBeTruthy();
    expect(screen.getByText('12 Ujian Aktif')).toBeTruthy();
    expect(screen.getByTestId('hero-action-btn')).toBeTruthy();
    expect(screen.getByText('Total Terjadwal')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Sedang Ujian')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });
});
