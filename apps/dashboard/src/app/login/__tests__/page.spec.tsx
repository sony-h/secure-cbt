import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoginPage from '../page';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockAuthState = {
  login: vi.fn(),
  isAuthenticated: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockAuthState = {
      login: vi.fn(),
      isAuthenticated: false,
    };
  });

  it('redirects to redirect param if already authenticated', () => {
    mockAuthState.isAuthenticated = true;
    mockSearchParams = new URLSearchParams('redirect=%2Fdashboard%2Fmonitoring');

    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/monitoring');
  });

  it('redirects to /dashboard if already authenticated and no redirect param', () => {
    mockAuthState.isAuthenticated = true;
    mockSearchParams = new URLSearchParams();

    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('submits credentials and navigates to the redirect path on success', async () => {
    mockSearchParams = new URLSearchParams('redirect=%2Fdashboard%2Fgrading');
    mockAuthState.login = vi.fn().mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/masukkan username atau email/i), {
      target: { value: 'teacher1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/masukkan password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(mockAuthState.login).toHaveBeenCalledWith('teacher1', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard/grading');
    });
  });

  it('rejects unsafe open redirect URLs and falls back to /dashboard', async () => {
    mockSearchParams = new URLSearchParams('redirect=https%3A%2F%2Fmalicious.com');
    mockAuthState.login = vi.fn().mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/masukkan username atau email/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByPlaceholderText(/masukkan password/i), {
      target: { value: 'admin123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
