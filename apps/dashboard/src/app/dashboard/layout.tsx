'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserRole } from '@secure-cbt/shared';
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
} from 'lucide-react';

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
  { title: 'Monitoring',  href: '/dashboard/monitoring', icon: MonitorPlay,     roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Laporan',     href: '/dashboard/reports',    icon: BarChart3,       roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { title: 'Pengaturan',  href: '/dashboard/settings',   icon: Settings,        roles: [UserRole.ADMIN] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Secure CBT</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="border-t p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium">{user?.full_name || user?.username}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-medium text-muted-foreground">
            {visibleItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))?.title || 'Dashboard'}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
