'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Zap,
  Calendar,
  Layers,
  Search,
  Tag,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_STORAGE_KEY,
  type ChangeCategory,
  type ChangelogEntry,
} from '@/lib/constants/changelog';

export interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

type VersionGroupFilter = 'all' | 'v1.7' | 'v1.6' | 'v1.5' | 'v1.0-v1.4';

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<VersionGroupFilter>('all');

  const latestVersion = CHANGELOG_ENTRIES[0]?.version;

  const handleClose = () => {
    if (typeof window !== 'undefined' && latestVersion) {
      try {
        localStorage.setItem(CHANGELOG_STORAGE_KEY, latestVersion);
      } catch (e) {
        console.error('Failed to set changelog seen version', e);
      }
    }
    onClose();
  };

  const filteredEntries = useMemo(() => {
    return CHANGELOG_ENTRIES.filter((entry) => {
      // Version group filter
      if (activeTab !== 'all' && entry.versionGroup !== activeTab) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(q);
        const matchesVersion = entry.version.toLowerCase().includes(q);
        const matchesChanges = entry.changes.some((c) =>
          c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
        );
        return matchesTitle || matchesVersion || matchesChanges;
      }

      return true;
    });
  }, [activeTab, searchQuery]);

  const getCategoryBadge = (category: ChangeCategory) => {
    switch (category) {
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Zap className="h-2.5 w-2.5" />
            Fitur Baru
          </span>
        );
      case 'security':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <ShieldCheck className="h-2.5 w-2.5" />
            Keamanan
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Peningkatan
          </span>
        );
      case 'fix':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Wrench className="h-2.5 w-2.5" />
            Perbaikan
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header with Aurora gradient shine */}
        <DialogHeader className="relative px-6 py-5 border-b border-border bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Catatan Rilis & Pembaruan Sistem
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Assessia v{latestVersion}
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Riwayat evolusi platform, fitur baru, peningkatan keamanan, dan performa dari awal rilis
                </p>
              </div>
            </div>
          </div>

          {/* Search bar & Group Tabs */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Version group filter tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua ({CHANGELOG_ENTRIES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('v1.7')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'v1.7'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                v1.7.x
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('v1.6')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'v1.6'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                v1.6.x
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('v1.5')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'v1.5'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                v1.5.x
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('v1.0-v1.4')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'v1.0-v1.4'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                v1.0 - v1.4
              </button>
            </div>

            {/* Interactive search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari pembaruan (misal: audio, KaTeX, kredensial)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
        </DialogHeader>

        {/* Content list with timeline nodes */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-border/40">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Tidak ada catatan pembaruan yang cocok.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Coba gunakan kata kunci pencarian yang lain atau pilih tab Semua.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => (
              <div
                key={entry.version}
                className={`pt-5 first:pt-0 relative transition-all`}
              >
                {/* Version & Date banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 text-foreground border border-border shadow-2xs">
                      {entry.version}
                    </span>
                    {entry.isLatest && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md uppercase tracking-wider shadow-xs">
                        Terbaru
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{entry.releaseDate}</span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  {entry.title}
                </h4>

                {/* Change item list */}
                <ul className="space-y-2 pl-1">
                  {entry.changes.map((change, cIdx) => (
                    <li
                      key={cIdx}
                      className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground group"
                    >
                      <div className="shrink-0 mt-0.5">
                        {getCategoryBadge(change.category)}
                      </div>
                      <span className="flex-1 text-foreground/90 font-normal">
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Versi Aktif: <strong>{latestVersion}</strong></span>
          </div>
          <Button
            onClick={handleClose}
            className="px-5 font-semibold text-xs rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20"
          >
            Mengerti & Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
