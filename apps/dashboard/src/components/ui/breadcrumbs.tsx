'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const PATH_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  academic: 'Akademik',
  students: 'Data Siswa',
  teachers: 'Data Guru',
  questions: 'Bank Soal',
  new: 'Studio Soal Baru',
  edit: 'Edit Soal',
  exams: 'Jadwal Ujian',
  monitoring: 'Monitoring Live',
  grading: 'Penilaian Esai',
  reports: 'Laporan & Nilai',
  settings: 'Pengaturan Sistem',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split('/').filter(Boolean) || [];

  if (segments.length <= 1) {
    return null;
  }

  // Build breadcrumb items
  const items = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const isLast = idx === segments.length - 1;
    const label = PATH_LABELS[seg] || (seg.length > 15 ? `${seg.slice(0, 8)}...` : seg);

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors p-0.5 rounded"
        title="Dashboard Utama"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.slice(1).map((item, i) => (
        <React.Fragment key={item.href}>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          {item.isLast ? (
            <span className="font-semibold text-foreground truncate max-w-[160px]">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors truncate max-w-[120px]"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
