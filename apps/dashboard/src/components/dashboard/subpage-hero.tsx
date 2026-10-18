'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SubpageHeroBadge {
  label: string;
  icon?: React.ElementType;
  variant?: 'violet' | 'cyan' | 'emerald' | 'amber' | 'default';
}

export interface SubpageHeroStat {
  label: string;
  value: string | number;
  accent?: string;
}

export interface SubpageHeroProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badges?: SubpageHeroBadge[];
  actions?: React.ReactNode;
  stats?: SubpageHeroStat[];
  className?: string;
}

const badgeVariantClasses: Record<
  NonNullable<SubpageHeroBadge['variant']>,
  string
> = {
  violet: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  default: 'bg-white/10 text-white/90 border-white/20',
};

export function SubpageHero({
  title,
  subtitle,
  icon: Icon,
  badges,
  actions,
  stats,
  className,
}: SubpageHeroProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#090d1c] via-[#0d1636] to-[#070b18] text-white p-5 sm:p-7 shadow-xl border border-violet-900/30',
        className,
      )}
    >
      {/* Subtle Constellation Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient Floating Aurora Glow Blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-60 w-60 rounded-full bg-blue-600/20 blur-3xl animate-pulse delay-700" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-cyan-500/15 blur-2xl animate-pulse delay-1000" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-2xl">
          {/* Top Pill Badges */}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {badges.map((b, idx) => {
                const BadgeIcon = b.icon;
                const variantClass =
                  badgeVariantClasses[b.variant || 'default'];
                return (
                  <span
                    key={idx}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-2xs',
                      variantClass,
                    )}
                  >
                    {BadgeIcon && <BadgeIcon className="h-3 w-3 shrink-0" />}
                    <span>{b.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Title with Icon */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-cyan-300 shadow-md shadow-violet-500/20 shrink-0 backdrop-blur-md">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-light">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Dock: Stats and/or Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          {/* Micro-Stats Bento */}
          {stats && stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {stats.map((s, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2 rounded-2xl bg-white/[0.06] border border-white/[0.1] backdrop-blur-md shadow-inner flex flex-col min-w-[90px]"
                >
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {s.label}
                  </span>
                  <span
                    className="text-lg sm:text-xl font-black text-white tabular-nums leading-tight mt-0.5"
                    style={s.accent ? { color: s.accent } : undefined}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons Dock */}
          {actions && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
