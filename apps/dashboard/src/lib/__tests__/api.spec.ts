import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAuthFailure } from '../api';

describe('handleAuthFailure', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-token');
    localStorage.setItem('refresh_token', 'mock-refresh');
  });

  it('clears tokens and redirects to login with encoded redirect path when on a protected route', () => {
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/dashboard/exams',
      search: '?status=ACTIVE',
      href: '',
    } as any;

    handleAuthFailure();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(window.location.href).toBe('/login?redirect=%2Fdashboard%2Fexams%3Fstatus%3DACTIVE');

    window.location = originalLocation as any;
  });

  it('redirects to plain /login when current path is root /', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/',
      search: '',
      href: '',
    } as any;

    handleAuthFailure();

    expect(window.location.href).toBe('/login');

    window.location = originalLocation as any;
  });

  it('does not redirect if already on /login', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/login',
      search: '',
      href: '',
    } as any;

    handleAuthFailure();

    expect(window.location.href).toBe('');

    window.location = originalLocation as any;
  });
});
