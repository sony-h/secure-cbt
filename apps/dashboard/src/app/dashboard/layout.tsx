'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UserRole } from '@secure-cbt/shared';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-slate-950 text-slate-100 border-slate-900 transition-transform overflow-y-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-900 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-50">Secure CBT</span>
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
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="border-t border-slate-900 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium text-slate-200">{displayName}</p>
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
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 lg:px-6 shadow-sm">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title */}
          <h1 className="text-base font-bold text-slate-900 min-w-0 truncate">{pageTitle}</h1>

          {/* Search */}
          <div className="hidden sm:relative sm:flex sm:flex-1 sm:max-w-xs ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari ujian, siswa..."
              className="h-9 pl-9 text-sm bg-slate-50 border-slate-200"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification */}
          <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
            <Bell className="h-5 w-5" />
            {/* TODO: wire real notification count */}
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              0
            </span>
          </Button>

          {/* Profile Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium text-foreground">{displayName}</div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
