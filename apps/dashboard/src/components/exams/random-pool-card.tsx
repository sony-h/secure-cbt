'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Dices, Scale } from 'lucide-react';
import type { ExamFormData } from './create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
  totalSelectedQuestions?: number;
}

export function RandomPoolCard({ form, setForm, totalSelectedQuestions = 0 }: Props) {
  const isEnabled = form.is_random_pool;
  const poolCount = form.pool_question_count ?? (totalSelectedQuestions > 0 ? totalSelectedQuestions : 10);

  const handleToggle = (checked: boolean) => {
    setForm({
      ...form,
      is_random_pool: checked,
      pool_question_count: checked
        ? form.pool_question_count || (totalSelectedQuestions > 0 ? totalSelectedQuestions : 10)
        : null,
    });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="random-pool-switch" className="text-sm font-semibold cursor-pointer">
              Ambil Sebagian Soal Secara Acak (Sub-sampling Pool)
            </Label>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
              Anti-Contek
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Setiap siswa mengerjakan paket subset soal berbeda yang ditarik dari bank soal.
          </p>
        </div>
        <Switch
          id="random-pool-switch"
          checked={isEnabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {isEnabled && (
        <div className="pt-3 border-t border-border/60 space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pool-question-count" className="text-xs font-semibold">
                  Jumlah Soal Dikerjakan Siswa
                </Label>
                {totalSelectedQuestions > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    dari <strong>{totalSelectedQuestions}</strong> soal dipilih
                  </span>
                )}
              </div>
              <Input
                id="pool-question-count"
                type="number"
                min={1}
                max={totalSelectedQuestions > 0 ? totalSelectedQuestions : undefined}
                value={poolCount}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setForm({ ...form, pool_question_count: val });
                }}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mode Penarikan Acak</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pool_mode: 'BALANCED' })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.pool_mode === 'BALANCED'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Seimbang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, pool_mode: 'PURE_RANDOM' })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.pool_mode === 'PURE_RANDOM'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Acak Murni</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bobot Poin per Tingkat Kesulitan
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Skor rapor dinormalisasi ke skala 0–100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-border/80 bg-background/50 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="points-easy" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Mudah
                  </Label>
                </div>
                <Input
                  id="points-easy"
                  type="number"
                  min={1}
                  value={form.points_easy}
                  onChange={(e) => setForm({ ...form, points_easy: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="rounded-lg border border-border/80 bg-background/50 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="points-medium" className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Sedang
                  </Label>
                </div>
                <Input
                  id="points-medium"
                  type="number"
                  min={1}
                  value={form.points_medium}
                  onChange={(e) => setForm({ ...form, points_medium: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="rounded-lg border border-border/80 bg-background/50 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="points-hard" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Sukar
                  </Label>
                </div>
                <Input
                  id="points-hard"
                  type="number"
                  min={1}
                  value={form.points_hard}
                  onChange={(e) => setForm({ ...form, points_hard: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
