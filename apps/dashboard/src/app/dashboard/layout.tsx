'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserRole } from '@secure-cbt/shared';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { APP_INFO } from '@/lib/constants/app-info';
import { CommandMenu } from '@/components/ui/command-menu';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useNotificationSocket } from '@/components/notifications/use-notification-socket';
import { ChangelogModal } from '@/components/changelog/changelog-modal';
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_STORAGE_KEY,
} from '@/lib/constants/changelog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileQuestion,
  ClipboardList,
  MonitorPlay,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  FileCheck,
  Bell,
  Search,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  OPERATOR: 'Operator',
  TEACHER: 'Guru',
  STUDENT: 'Siswa',
};

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard',   href: '/dashboard',           icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER] },
  { title: 'Akademik',    href: '/dashboard/academic',   icon: School,          roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER] },
  { title: 'Siswa',       href: '/dashboard/students',   icon: Users,           roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER] },
  { title: 'Guru',        href: '/dashboard/teachers',   icon: GraduationCap,   roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { title: 'Bank Soal',   href: '/dashboard/questions',  icon: FileQuestion,    roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Ujian',       href: '/dashboard/exams',      icon: ClipboardList,   roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER] },
  { title: 'Monitoring',  href: '/dashboard/monitoring', icon: MonitorPlay,   roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Penilaian',   href: '/dashboard/grading',    icon: FileCheck,     roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Laporan',     href: '/dashboard/reports',    icon: BarChart3,     roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Pengaturan',  href: '/dashboard/settings',   icon: Settings,        roles: [UserRole.ADMIN] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(false);

  // Global monitoring socket listener for notifications
  useNotificationSocket();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('assessia:sidebar-collapsed');
      if (saved !== null) {
        setIsRailCollapsed(saved === 'true');
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsRailCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem('assessia:sidebar-collapsed', String(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleRail = () => {
    setIsRailCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('assessia:sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated) {
      try {
        const seen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
        if (seen !== CHANGELOG_ENTRIES[0]?.version) {
          setHasUnreadChangelog(true);
        }
      } catch {}
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  const visibleItems = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname?.startsWith(href + '/');

  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayName = user?.full_name || user?.username || '';
  const roleLabel = roleLabels[user?.role || ''] || user?.role || '';

  const pageTitle = visibleItems.find((item) => isActive(item.href))?.title || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar-rail"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-slate-950 text-slate-100 border-slate-900 transition-all duration-300 ease-in-out overflow-y-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full',
          isRailCollapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-slate-900 transition-all',
            isRailCollapsed ? 'justify-center px-2' : 'gap-2.5 px-5',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0">
            <img
              src="/logo-only-light.png"
              alt="Assessia"
              className="h-6 w-6 object-contain"
            />
          </div>
          {!isRailCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="text-sm font-extrabold text-white tracking-tight leading-tight">Assessia</span>
              <span className="text-[10px] text-slate-400 font-medium">by Orivastra</span>
            </div>
          )}

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            data-testid="rail-collapse-toggle"
            onClick={toggleRail}
            className={cn(
              'hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer',
              isRailCollapsed ? 'mt-0.5' : 'ml-auto',
            )}
            title={isRailCollapsed ? 'Perlebar Sidebar (Ctrl+B)' : 'Ciutkan ke Icon Rail (Ctrl+B)'}
            aria-label={isRailCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}
          >
            {isRailCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-slate-400 hover:text-slate-200 hover:bg-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-1 overflow-y-auto', isRailCollapsed ? 'p-2' : 'p-4')}>
          <>
            {!isRailCollapsed && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Utama</p>
            )}
            {visibleItems.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={item.title}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                  isRailCollapsed ? 'justify-center p-2.5 my-1' : 'gap-3 px-3 py-2',
                  isActive(item.href)
                    ? 'border-l-2 border-indigo-400 bg-indigo-600/15 text-indigo-200 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:translate-x-0.5',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isRailCollapsed && <span>{item.title}</span>}
              </Link>
            ))}
            {!isRailCollapsed && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4">Manajemen</p>
            )}
            {visibleItems.slice(2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={item.title}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                  isRailCollapsed ? 'justify-center p-2.5 my-1' : 'gap-3 px-3 py-2',
                  isActive(item.href)
                    ? 'border-l-2 border-indigo-400 bg-indigo-600/15 text-indigo-200 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:translate-x-0.5',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isRailCollapsed && <span>{item.title}</span>}
              </Link>
            ))}
          </>
        </nav>

        {/* User info & logout */}
        <div className={cn('border-t border-slate-900', isRailCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4')}>
          {!isRailCollapsed ? (
            <>
              <div className="mb-3 text-sm">
                <p className="font-medium text-slate-200 truncate">{displayName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-slate-300 border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white"
                onClick={() => { logout(); router.push('/login'); }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </Button>

              <button
                type="button"
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                className="mt-3 pt-3 border-t border-slate-900/80 w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-indigo-400 group-hover:rotate-12 transition-transform" />
                  <span>Assessia v{APP_INFO.version}</span>
                  {hasUnreadChangelog && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </span>
                <span className="font-semibold text-slate-500 group-hover:text-slate-400">Rilis & Pembaruan</span>
              </button>
            </>
          ) : (
            <>
              <div
                className="h-8 w-8 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xs font-bold"
                title={`${displayName} (${roleLabel})`}
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={() => { logout(); router.push('/login'); }}
                title="Keluar"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                title={`Assessia v${APP_INFO.version}`}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-indigo-400 hover:text-indigo-200 hover:bg-slate-900 transition-colors cursor-pointer relative"
              >
                <Sparkles className="h-4 w-4" />
                {hasUnreadChangelog && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={cn('flex flex-1 flex-col transition-all duration-300 ease-in-out', isRailCollapsed ? 'lg:ml-[68px]' : 'lg:ml-64')}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur-md px-4 lg:px-6 shadow-xs">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title & Dynamic Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-foreground min-w-0 truncate">{pageTitle}</h1>
            <Breadcrumbs />
          </div>

          {/* Command Menu Launcher (⌘K) */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2.5 h-9 w-60 rounded-xl border border-input/80 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-inner ml-4 cursor-pointer"
            title="Buka Navigasi Cepat (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium">Navigasi cepat...</span>
            <kbd className="inline-flex items-center gap-0.5 rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-bold border border-border shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Live Telemetry Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Telemetry</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-border">
                <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium text-foreground">{displayName}</div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                className="cursor-pointer"
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                <span>Catatan Rilis (v{APP_INFO.version})</span>
                {hasUnreadChangelog && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 animate-fade-in p-4 lg:p-6 pb-24 lg:pb-6 bg-slate-50/70 dark:bg-slate-950/20">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Global Dashboard Footer */}
        <footer className="mt-auto border-t bg-card/60 py-3.5 px-6 pb-20 lg:pb-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{APP_INFO.fullCopyright}</span>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{APP_INFO.name} v{APP_INFO.version}</span>
          </div>
        </footer>

        {/* Mobile/Tablet Quick Frosted Thumb Bar */}
        <nav
          data-testid="mobile-bottom-bar"
          className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-background/85 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl shadow-black/25 px-2 py-1.5 flex items-center justify-around"
        >
          <Link
            href="/dashboard"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all active:scale-95',
              pathname === '/dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Beranda</span>
          </Link>
          <Link
            href="/dashboard/questions"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all active:scale-95',
              isActive('/dashboard/questions')
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileQuestion className="h-4 w-4" />
            <span>Soal</span>
          </Link>

          {/* Elevated Center Telemetry Pulse Button */}
          <Link
            href="/dashboard/monitoring"
            data-testid="mobile-pulse-telemetry"
            aria-label="Pusat Monitoring Ujian Live"
            className={cn(
              'relative -top-2 flex flex-col items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 active:scale-90 transition-transform radar-pulse-ring cursor-pointer',
              isActive('/dashboard/monitoring') ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-background' : '',
            )}
          >
            <MonitorPlay className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Pantau</span>
          </Link>

          <Link
            href="/dashboard/exams"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all active:scale-95',
              isActive('/dashboard/exams')
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Ujian</span>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      {/* In-App Release Notes / Changelog Modal */}
      <ChangelogModal
        open={changelogOpen}
        onClose={() => {
          setChangelogOpen(false);
          setHasUnreadChangelog(false);
        }}
      />
    </div>
  );
}
