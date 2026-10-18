'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
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
  Search,
  Sparkles,
  ExternalLink,
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
  category: 'main' | 'academic' | 'evaluation' | 'system';
}

const navItems: NavItem[] = [
  { title: 'Dashboard',   href: '/dashboard',           icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER], category: 'main' },
  { title: 'Akademik',    href: '/dashboard/academic',   icon: School,          roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER], category: 'academic' },
  { title: 'Siswa',       href: '/dashboard/students',   icon: Users,           roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER], category: 'academic' },
  { title: 'Guru',        href: '/dashboard/teachers',   icon: GraduationCap,   roles: [UserRole.ADMIN, UserRole.OPERATOR],                   category: 'academic' },
  { title: 'Bank Soal',   href: '/dashboard/questions',  icon: FileQuestion,    roles: [UserRole.ADMIN, UserRole.TEACHER],                    category: 'evaluation' },
  { title: 'Ujian',       href: '/dashboard/exams',      icon: ClipboardList,   roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER], category: 'evaluation' },
  { title: 'Monitoring',  href: '/dashboard/monitoring', icon: MonitorPlay,   roles: [UserRole.ADMIN, UserRole.TEACHER],                    category: 'evaluation' },
  { title: 'Penilaian',   href: '/dashboard/grading',    icon: FileCheck,     roles: [UserRole.ADMIN, UserRole.TEACHER],                    category: 'evaluation' },
  { title: 'Laporan',     href: '/dashboard/reports',    icon: BarChart3,     roles: [UserRole.ADMIN, UserRole.TEACHER],                    category: 'evaluation' },
  { title: 'Pengaturan',  href: '/dashboard/settings',   icon: Settings,        roles: [UserRole.ADMIN],                                      category: 'system' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(false);

  // Initialize collapse preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('assessia:sidebar-collapsed');
        if (saved === 'true') {
          setIsCollapsed(true);
        }
      } catch {}
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('assessia:sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Global monitoring socket listener for notifications
  useNotificationSocket();

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
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-violet-600 border-t-transparent shadow-md shadow-violet-500/20" />
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">Memuat sesi Assessia...</p>
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

  // Group nav items
  const mainItems = visibleItems.filter((i) => i.category === 'main');
  const academicItems = visibleItems.filter((i) => i.category === 'academic');
  const evaluationItems = visibleItems.filter((i) => i.category === 'evaluation');
  const systemItems = visibleItems.filter((i) => i.category === 'system');

  const renderNavGroup = (label: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <p className="px-3 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            {label}
          </p>
        )}
        {isCollapsed && <div className="h-px bg-white/[0.06] my-2 mx-1" />}
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              title={item.title}
              className={cn(
                'group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 select-none',
                isCollapsed
                  ? 'justify-center p-2.5 mx-auto'
                  : 'gap-3 px-3 py-2',
                active
                  ? 'bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] hover:translate-x-0.5',
              )}
            >
              <item.icon
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-110',
                  isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                  active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200',
                )}
              />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
              {active && !isCollapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-xs shadow-cyan-300" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      
      {/* Top Aurora Accent Ribbon across the whole dashboard */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] z-50 pointer-events-none" />

      {/* Mobile sidebar backdrop with blur */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========================================================
          SIDEBAR: COSMIC OBSIDIAN AURORA (Fixed on desktop)
          ======================================================== */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-[#080c1b] text-slate-100 border-slate-900/80 transition-all duration-300 ease-in-out lg:translate-x-0 overflow-hidden shadow-2xl',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
        )}
      >
        {/* Subtle Constellation Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Sidebar Aurora Blobs */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-12 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Sidebar Brand Header */}
        <div
          className={cn(
            'relative z-10 flex h-16 items-center border-b border-white/[0.06] bg-[#080c1b]/60 backdrop-blur-md shrink-0 transition-all',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
          )}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 p-1.5 ring-1 ring-white/15 shadow-md shadow-violet-500/10 hover:scale-105 transition-transform"
                title={APP_INFO.name}
              >
                <img
                  src="/logo-only-light.png"
                  alt="Assessia"
                  className="h-full w-full object-contain drop-shadow"
                />
              </Link>
              <button
                type="button"
                data-testid="sidebar-collapse-toggle"
                onClick={toggleSidebarCollapsed}
                aria-label="Bentangkan navigasi"
                className="hidden lg:flex h-6 w-6 items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                title="Bentangkan navigasi"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 group focus:outline-none min-w-0"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 p-1.5 ring-1 ring-white/15 shrink-0 shadow-md shadow-violet-500/10 group-hover:scale-105 transition-transform backdrop-blur-sm">
                  <img
                    src="/logo-only-light.png"
                    alt="Assessia"
                    className="h-full w-full object-contain drop-shadow"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                    {APP_INFO.name}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
                      PRO
                    </span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-semibold tracking-wide uppercase mt-0.5">
                    by {APP_INFO.brand}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  data-testid="sidebar-collapse-toggle"
                  onClick={toggleSidebarCollapsed}
                  aria-label="Ciutkan navigasi"
                  className="hidden lg:flex h-8 w-8 items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Ciutkan navigasi"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 lg:hidden rounded-lg"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="relative z-10 flex-1 space-y-2 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {renderNavGroup('Utama', mainItems)}
          {renderNavGroup('Manajemen Akademik', academicItems)}
          {renderNavGroup('Evaluasi & Monitoring', evaluationItems)}
          {renderNavGroup('Pengaturan Sistem', systemItems)}
        </nav>

        {/* Sidebar User Dock & Footer */}
        <div
          className={cn(
            'relative z-10 border-t border-white/[0.06] bg-[#060916]/80 backdrop-blur-md shrink-0 transition-all',
            isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3.5',
          )}
        >
          {isCollapsed ? (
            <>
              <div
                className="p-0.5 rounded-full bg-gradient-to-tr from-violet-500 via-blue-500 to-cyan-400 cursor-pointer shadow-xs"
                title={`${displayName} (${roleLabel})`}
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
              >
                <Avatar className="h-8 w-8 border border-[#080c1b]">
                  <AvatarFallback className="bg-slate-900 text-[11px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={`Assessia v${APP_INFO.version} - Catatan Rilis`}
              >
                <Sparkles className="h-4 w-4 text-violet-400" />
              </button>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                title="Keluar dari akun"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {/* User Profile Capsule */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-2.5 shadow-inner">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-violet-500 via-blue-500 to-cyan-400 shrink-0">
                  <Avatar className="h-8 w-8 border border-[#080c1b]">
                    <AvatarFallback className="bg-slate-900 text-[11px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-white truncate leading-tight">{displayName}</p>
                  <p className="text-[10px] font-medium text-cyan-300/80 truncate mt-0.5">{roleLabel}</p>
                </div>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  title="Keluar dari akun"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Changelog & Version Pill */}
              <button
                type="button"
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer group text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-violet-400 group-hover:rotate-12 transition-transform" />
                  <span>Assessia v{APP_INFO.version}</span>
                  {hasUnreadChangelog && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </span>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Rilis &amp; Pembaruan</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ========================================================
          MAIN WORKSPACE AREA (Left offset lg:ml-64 or lg:ml-[72px])
          ======================================================== */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 transition-all duration-300',
          isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64',
        )}
      >
        
        {/* Top Header Bar (Frosted Glass) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6 shadow-2xs">
          
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka navigasi menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title & Dynamic Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-bold text-foreground min-w-0 truncate">{pageTitle}</h1>
            <Breadcrumbs />
          </div>

          {/* Command Menu Launcher (⌘K) */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2.5 h-9 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted/80 hover:border-violet-400/50 dark:hover:border-violet-600/50 transition-all shadow-inner ml-3 cursor-pointer"
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
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Telemetry</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-border hover:ring-violet-500 transition-all">
                <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-blue-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="font-bold text-foreground text-xs">{displayName}</div>
                <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setChangelogOpen(true);
                  setHasUnreadChangelog(false);
                }}
                className="cursor-pointer text-xs"
              >
                <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
                <span>Catatan Rilis (v{APP_INFO.version})</span>
                {hasUnreadChangelog && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(APP_INFO.website, '_blank')}
                className="cursor-pointer text-xs"
              >
                <ExternalLink className="mr-2 h-4 w-4 text-slate-400" />
                <span>Tentang Orivastra</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); router.push('/login'); }}
                className="text-destructive focus:text-destructive cursor-pointer text-xs"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Main Content Slot */}
        <main className="flex-1 animate-fade-in p-4 lg:p-6 pb-24 lg:pb-8 bg-slate-50/70 dark:bg-slate-950/20">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Global Dashboard Footer */}
        <footer className="mt-auto border-t bg-card/60 py-3.5 px-6 pb-20 lg:pb-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {APP_INFO.copyrightYear} {APP_INFO.name} &bull; {APP_INFO.brand}. Seluruh hak cipta dilindungi undang-undang.</span>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{APP_INFO.name} v{APP_INFO.version}</span>
            <span>&bull;</span>
            <a
              href={APP_INFO.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
            >
              orivastra.id
            </a>
          </div>
        </footer>

        {/* Mobile/Tablet Quick Frosted Bottom Bar (Tested by test suite) */}
        <nav
          data-testid="mobile-bottom-bar"
          className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-black/10 px-2 py-1.5 flex items-center justify-around"
        >
          <Link
            href="/dashboard"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95',
              pathname === '/dashboard'
                ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Beranda</span>
          </Link>
          <Link
            href="/dashboard/questions"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95',
              isActive('/dashboard/questions')
                ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileQuestion className="h-4 w-4" />
            <span>Soal</span>
          </Link>
          <Link
            href="/dashboard/exams"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95',
              isActive('/dashboard/exams')
                ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Ujian</span>
          </Link>
          <Link
            href="/dashboard/monitoring"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95',
              isActive('/dashboard/monitoring')
                ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MonitorPlay className="h-4 w-4" />
            <span>Pantau</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
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
