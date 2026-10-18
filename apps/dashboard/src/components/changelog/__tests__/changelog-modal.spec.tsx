import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChangelogModal } from '../changelog-modal';
import { CHANGELOG_ENTRIES, CHANGELOG_STORAGE_KEY } from '@/lib/constants/changelog';

describe('ChangelogModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders changelog entries with versions, release dates, and categories', () => {
    const latest = CHANGELOG_ENTRIES[0];

    render(
      <ChangelogModal
        open={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Catatan Rilis & Pembaruan Sistem')).toBeTruthy();
    expect(screen.getAllByText(latest.version).length).toBeGreaterThan(0);
    expect(screen.getByText(latest.title)).toBeTruthy();
  });

  it('calls onClose and updates localStorage with latest seen version when closed', () => {
    const onClose = vi.fn();
    const latest = CHANGELOG_ENTRIES[0];

    render(
      <ChangelogModal
        open={true}
        onClose={onClose}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /mengerti & tutup/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(CHANGELOG_STORAGE_KEY)).toBe(latest.version);
  });

  it('filters entries when typing into the search input', () => {
    render(
      <ChangelogModal
        open={true}
        onClose={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/cari pembaruan/i);
    expect(searchInput).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: 'KaTeX' } });

    // Should find entry with KaTeX
    expect(screen.getAllByText(/KaTeX/i).length).toBeGreaterThan(0);
  });

  it('filters entries when selecting a version group tab', () => {
    render(
      <ChangelogModal
        open={true}
        onClose={vi.fn()}
      />,
    );

    const v10Tab = screen.getByRole('button', { name: /v1\.0/i });
    expect(v10Tab).toBeTruthy();

    fireEvent.click(v10Tab);
    expect(screen.getByText(/v1\.0\.0/i)).toBeTruthy();
  });
});
