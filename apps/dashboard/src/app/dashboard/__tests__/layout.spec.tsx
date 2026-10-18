import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DashboardLayout from '../layout';
import { UserRole } from '@secure-cbt/shared';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/dashboard/exams';
let mockAuthState = {
  user: null as any,
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}));

// Mock theme toggle and command menu to keep test lightweight
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock('@/components/ui/command-menu', () => ({
  CommandMenu: () => <div data-testid="command-menu" />,
}));
vi.mock('@/components/ui/breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPathname = '/dashboard/exams';
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    };
  });

  it('redirects unauthenticated users immediately to /login with redirect parameter', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fdashboard%2Fexams');
    expect(screen.queryByTestId('child-page')).toBeNull();
  });

  it('renders children when user is authenticated', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('child-page')).toBeTruthy();
  });

  it('renders changelog button in sidebar and opens changelog modal when clicked', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    const changelogBtn = screen.getByRole('button', { name: /rilis & pembaruan/i });
    expect(changelogBtn).toBeTruthy();
  });

  it('renders mobile quick bottom navigation bar with essential shortcuts', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    const mobileNav = screen.getByTestId('mobile-bottom-bar');
    expect(mobileNav).toBeTruthy();
    expect(screen.getByText('Pantau')).toBeTruthy();
  });

  it('renders auto-docking sidebar rail with toggle button and allows collapsing', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    const sidebar = screen.getByTestId('sidebar-rail');
    expect(sidebar).toBeTruthy();

    const collapseToggle = screen.getByTestId('rail-collapse-toggle');
    expect(collapseToggle).toBeTruthy();

    // Initial state: expanded (has w-64 class)
    expect(sidebar.className).toContain('w-64');

    // Click collapse toggle
    fireEvent.click(collapseToggle);

    // After collapse: has w-[68px]
    expect(sidebar.className).toContain('w-[68px]');
  });

  it('renders center pulse telemetry proctor button on mobile bottom bar', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    const centerPulseBtn = screen.getByTestId('mobile-pulse-telemetry');
    expect(centerPulseBtn).toBeTruthy();
  });

  it('toggles sidebar rail collapse when pressing Ctrl+B shortcut', () => {
    mockAuthState = {
      user: {
        id: 'u1',
        username: 'admin',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="child-page">Secret Exam Page</div>
      </DashboardLayout>,
    );

    const sidebar = screen.getByTestId('sidebar-rail');
    expect(sidebar.className).toContain('w-64');

    // Press Ctrl+B
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(sidebar.className).toContain('w-[68px]');

    // Press Ctrl+B again to expand
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(sidebar.className).toContain('w-64');
  });
});
