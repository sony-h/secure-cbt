'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@secure-cbt/shared';
import {
  Search,
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  FileQuestion,
  ClipboardList,
  MonitorPlay,
  FileCheck,
  BarChart3,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  category: 'Halaman' | 'Aksi Cepat' | 'Tema';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  roles?: UserRole[];
  action: () => void;
}

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query and selected index on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => [
    // Halaman
    {
      id: 'nav-dashboard',
      category: 'Halaman',
      title: 'Dashboard Utama',
      subtitle: 'Ringkasan sistem & statistik',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER],
      action: () => { router.push('/dashboard'); onOpenChange(false); },
    },
    {
      id: 'nav-academic',
      category: 'Halaman',
      title: 'Akademik',
      subtitle: 'Tahun ajaran, jurusan, kelas & mapel',
      icon: School,
      roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER],
      action: () => { router.push('/dashboard/academic'); onOpenChange(false); },
    },
    {
      id: 'nav-students',
      category: 'Halaman',
      title: 'Data Siswa',
      subtitle: 'Daftar & status peserta didik',
      icon: Users,
      roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER],
      action: () => { router.push('/dashboard/students'); onOpenChange(false); },
    },
    {
      id: 'nav-teachers',
      category: 'Halaman',
      title: 'Data Guru',
      subtitle: 'Daftar pengajar & mapel yang diampu',
      icon: GraduationCap,
      roles: [UserRole.ADMIN, UserRole.OPERATOR],
      action: () => { router.push('/dashboard/teachers'); onOpenChange(false); },
    },
    {
      id: 'nav-questions',
      category: 'Halaman',
      title: 'Bank Soal',
      subtitle: 'Katalog & pengelompokan pertanyaan',
      icon: FileQuestion,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/questions'); onOpenChange(false); },
    },
    {
      id: 'nav-exams',
      category: 'Halaman',
      title: 'Jadwal Ujian',
      subtitle: 'Kelola jadwal, durasi & token',
      icon: ClipboardList,
      roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER],
      action: () => { router.push('/dashboard/exams'); onOpenChange(false); },
    },
    {
      id: 'nav-monitoring',
      category: 'Halaman',
      title: 'Monitoring Live',
      subtitle: 'Pantau sesi ujian real-time',
      icon: MonitorPlay,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/monitoring'); onOpenChange(false); },
    },
    {
      id: 'nav-grading',
      category: 'Halaman',
      title: 'Penilaian Esai',
      subtitle: 'Periksa & nilai jawaban uraian siswa',
      icon: FileCheck,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/grading'); onOpenChange(false); },
    },
    {
      id: 'nav-reports',
      category: 'Halaman',
      title: 'Laporan & Rekap Nilai',
      subtitle: 'Analisis nilai & ekspor rekapitulasi',
      icon: BarChart3,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/reports'); onOpenChange(false); },
    },
    {
      id: 'nav-settings',
      category: 'Halaman',
      title: 'Pengaturan Sistem',
      subtitle: 'Kebijakan ujian, keamanan & proctor',
      icon: Settings,
      roles: [UserRole.ADMIN],
      action: () => { router.push('/dashboard/settings'); onOpenChange(false); },
    },

    // Aksi Cepat
    {
      id: 'act-new-question',
      category: 'Aksi Cepat',
      title: 'Studio Soal Baru',
      subtitle: 'Tulis soal dengan KaTeX & diagram',
      icon: Plus,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/questions/new'); onOpenChange(false); },
    },
    {
      id: 'act-new-exam',
      category: 'Aksi Cepat',
      title: 'Buat Jadwal Ujian Baru',
      subtitle: 'Luncurkan sesi ujian untuk kelas',
      icon: Plus,
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      action: () => { router.push('/dashboard/exams'); onOpenChange(false); },
    },
    {
      id: 'act-logout',
      category: 'Aksi Cepat',
      title: 'Keluar dari Akun',
      subtitle: 'Akhiri sesi administrator',
      icon: LogOut,
      action: () => { logout(); router.push('/login'); onOpenChange(false); },
    },

    // Tema
    {
      id: 'theme-light',
      category: 'Tema',
      title: 'Mode Terang (Light Mode)',
      subtitle: 'Tampilan bersih porselen eksekutif',
      icon: Sun,
      action: () => { setTheme('light'); onOpenChange(false); },
    },
    {
      id: 'theme-dark',
      category: 'Tema',
      title: 'Mode Gelap (Dark Mode)',
      subtitle: 'Tampilan obsidian berlatar pekat',
      icon: Moon,
      action: () => { setTheme('dark'); onOpenChange(false); },
    },
    {
      id: 'theme-system',
      category: 'Tema',
      title: 'Ikuti Pengaturan Sistem',
      subtitle: 'Menyesuaikan mode otomatis perangkat',
      icon: Laptop,
      action: () => { setTheme('system'); onOpenChange(false); },
    },
  ], [router, logout, setTheme, onOpenChange]);

  // Filter based on user role and query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.roles && user?.role && !item.roles.includes(user.role)) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, user?.role, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex]!.action();
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-[50%] top-[20%] z-50 w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-0 shadow-2xl backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Ketik perintah, menu, atau cari halaman..."
              className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground border border-border">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Tidak ada menu atau aksi yang cocok dengan "{query}"
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted/70'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                        isSelected
                          ? 'border-white/20 bg-white/20 text-white'
                          : 'border-border bg-card text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded',
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p
                          className={cn(
                            'text-xs truncate',
                            isSelected ? 'text-white/80' : 'text-muted-foreground'
                          )}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {isSelected && <ArrowRight className="h-4 w-4 shrink-0 text-white/90" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="border-t border-border/70 bg-muted/40 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Navigasi Cepat Assessia</span>
            <div className="flex items-center gap-3">
              <span>↑↓ Navigasi</span>
              <span>↵ Pilih</span>
              <span>ESC Tutup</span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
