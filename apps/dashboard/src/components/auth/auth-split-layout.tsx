'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { APP_INFO } from '@/lib/constants/app-info';

type BadgeVariant = 'purple' | 'cyan' | 'pink' | 'emerald' | 'amber';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badgeText?: string;
  badgeVariant?: BadgeVariant;
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; border: string; text: string; dot: string }> = {
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200/80 dark:border-violet-800/50',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-600 dark:bg-violet-400',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200/80 dark:border-cyan-800/50',
    text: 'text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200/80 dark:border-pink-800/50',
    text: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-600 dark:bg-pink-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200/80 dark:border-emerald-800/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200/80 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
};

export function AuthSplitLayout({
  children,
  badgeText,
  badgeVariant = 'purple',
  title,
  subtitle,
  backHref,
  backLabel = 'Kembali',
}: AuthSplitLayoutProps) {
  const badgeStyle = (BADGE_STYLES[badgeVariant] ?? BADGE_STYLES.purple)!;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground overflow-x-hidden selection:bg-violet-500/20 selection:text-violet-700 dark:selection:text-violet-300">
      
      {/* ========================================================
          LEFT SPACE: INTERACTIVE FORM CONTAINER (50% on desktop)
          ======================================================== */}
      <section className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/50 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 relative min-h-screen">
        
        {/* Top Aurora Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] z-20" />

        {/* Ambient Subtle Glow Blobs */}
        <div className="absolute top-12 left-10 w-72 h-72 bg-violet-300/20 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-cyan-300/20 dark:bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <header className="relative z-10 flex items-center justify-between mb-8">
          <Link href="/login" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 p-1.5 shadow-md shadow-violet-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src="/logo-only-light.png"
                alt="Assessia Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                {APP_INFO.name}
              </div>
              <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                by {APP_INFO.brand}
              </div>
            </div>
          </Link>

          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>v{APP_INFO.version}</span>
          </div>
        </header>

        {/* Form Content Wrapper */}
        <main className="relative z-10 my-auto max-w-md w-full mx-auto py-4">
          {backHref && (
            <div className="mb-4">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{backLabel}</span>
              </Link>
            </div>
          )}

          {(badgeText || title || subtitle) && (
            <div className="mb-6">
              {badgeText && (
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border tracking-wide uppercase mb-3 ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                  {badgeText}
                </div>
              )}

              {title && (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
              )}

              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </main>

        {/* Left Space Footer */}
        <footer className="relative z-10 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-2">
          <span>&copy; {APP_INFO.copyrightYear} {APP_INFO.name} &bull; {APP_INFO.brand}</span>
          <a
            href={APP_INFO.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:underline font-semibold transition-colors flex items-center gap-1"
          >
            <span>orivastra.id</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </footer>
      </section>

      {/* ========================================================
          RIGHT SPACE: IMMERSIVE COSMIC SHOWCASE (50% on desktop)
          ======================================================== */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#090d1c] text-white p-8 sm:p-12 lg:p-14 xl:p-16 flex-col justify-between relative overflow-hidden select-none">
        
        {/* Subtle Constellation / Radial Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Animated Aurora Glow Blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/25 rounded-full blur-[90px] animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-blue-600/25 rounded-full blur-[80px] animate-pulse delay-700 pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-88 h-88 bg-cyan-500/20 rounded-full blur-[85px] animate-pulse delay-1000 pointer-events-none" />

        {/* Top Showcase Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/20 shadow-xl shadow-purple-500/20 flex items-center justify-center">
              <img
                src="/logo-only-light.png"
                alt="Assessia Logo"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                {APP_INFO.name}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-sm">
                  PRO
                </span>
              </div>
              <div className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
                by {APP_INFO.brand}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Cloud Integrity v{APP_INFO.version}</span>
          </div>
        </div>

        {/* Center Showcase Feature & Motto */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-cyan-400/30 tracking-wide mb-4 backdrop-blur-md shadow-sm">
              <span className="text-violet-400">✦</span> NEXT-GEN COMPUTER BASED TESTING
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Ujian Digital Presisi, <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Integritas Tanpa Kompromi.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300/90 mt-4 leading-relaxed max-w-lg font-light">
              Dirancang untuk institusi pendidikan modern. Kombinasi analitik butir soal presisi tinggi, perlindungan anti-cheat multi-layer, dan penyusunan ujian berbasis LaTeX.
            </p>
          </div>

          {/* Floating Bento Glass Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Card 1: Anti-Cheat */}
            <div className="p-4 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-violet-400/40 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white tracking-wide">
                Full-Lockdown Anti-Cheat
              </div>
              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Deteksi tab exit, freeze detection, dan audio stimulus deterrence real-time.
              </div>
            </div>

            {/* Card 2: LaTeX & Random Pool */}
            <div className="p-4 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white tracking-wide">
                Random Pool &amp; LaTeX Math
              </div>
              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Formula matematika kompleks, import Excel cepat, dan pengacakan butir soal adaptif.
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Showcase Footer */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-white tracking-wider uppercase">
              &ldquo;{APP_INFO.tagline}&rdquo;
            </div>
            <div className="text-[11px] text-slate-400 italic mt-0.5">
              &ldquo;{APP_INFO.parentTagline}&rdquo; &bull; {APP_INFO.brand} Ecosystem
            </div>
          </div>

          <a
            href={APP_INFO.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-cyan-300 flex items-center gap-1.5 border border-cyan-500/30 transition-colors"
          >
            <span>orivastra.id</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </section>

    </div>
  );
}
