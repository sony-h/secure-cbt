'use client';

import React, { useState } from 'react';
import { MathRenderer } from '@/components/ui/math-renderer';
import { Badge } from '@/components/ui/badge';
import { Flag, Check, Smartphone, ZoomIn } from 'lucide-react';

interface QuestionPhonePreviewProps {
  content: string;
  type: string;
  imageUrl?: string | null;
  difficulty: string;
  explanation?: string | null;
  options: { content: string; is_correct: boolean; image_url?: string | null }[];
  tags?: string[];
  subjectName?: string;
}

export function QuestionPhonePreview({
  content,
  type,
  imageUrl,
  difficulty,
  explanation,
  options,
  tags = [],
  subjectName = 'Mata Pelajaran',
}: QuestionPhonePreviewProps) {
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<Set<number>>(new Set());
  const [isFlagged, setIsFlagged] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleSelect = (idx: number) => {
    if (type === 'MULTI_SELECT') {
      const next = new Set(selectedMulti);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      setSelectedMulti(next);
    } else {
      setSelectedOptionIdx(idx);
    }
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'EASY':
        return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
      case 'HARD':
        return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[370px] rounded-[36px] border-[6px] border-slate-800 bg-slate-950 p-2.5 shadow-2xl overflow-hidden ring-1 ring-border select-none">
      {/* Phone Camera Punch-hole */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 h-3.5 w-24 bg-slate-900 rounded-full z-30 flex items-center justify-end px-3">
        <div className="h-2 w-2 rounded-full bg-slate-800/80 ring-1 ring-slate-700/50" />
      </div>

      {/* Screen Frame */}
      <div className="rounded-[28px] bg-slate-50 dark:bg-slate-900 text-foreground overflow-y-auto max-h-[640px] flex flex-col pt-7 pb-4 px-3.5 shadow-inner">
        {/* App Bar Simulation */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-primary tracking-tight">Secure CBT</span>
            <span className="text-[10px] text-muted-foreground">• {subjectName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${getDifficultyColor()}`}>
              {difficulty === 'EASY' ? 'Mudah' : difficulty === 'HARD' ? 'Sulit' : 'Sedang'}
            </Badge>
          </div>
        </div>

        {/* Card Header & Ragu-ragu */}
        <div className="flex items-center justify-between mt-3 mb-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
            Soal 1
          </div>
          <button
            type="button"
            onClick={() => setIsFlagged(!isFlagged)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors ${
              isFlagged
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
            }`}
          >
            <Flag className={`h-3 w-3 ${isFlagged ? 'fill-amber-500 text-amber-600' : ''}`} />
            Ragu-ragu
          </button>
        </div>

        {/* Question Prompt Card */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm space-y-2.5">
          {imageUrl && (
            <div
              onClick={() => setLightboxImage(imageUrl)}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40 max-h-48 flex items-center justify-center"
            >
              <img
                src={imageUrl}
                alt="Stimulus Soal"
                className="w-full h-auto object-contain transition-transform group-hover:scale-105 duration-200"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                <ZoomIn className="h-3.5 w-3.5" /> Perbesar
              </div>
            </div>
          )}

          <div className="text-[13px] leading-relaxed text-foreground font-medium">
            {content ? (
              <MathRenderer content={content} />
            ) : (
              <span className="text-muted-foreground/60 italic">Teks pertanyaan akan tampil di sini...</span>
            )}
          </div>
        </div>

        {/* Answer Options */}
        {type !== 'ESSAY' && (
          <div className="mt-3 space-y-2">
            {options.map((opt, idx) => {
              const label = String.fromCharCode(65 + idx);
              const isSelected =
                type === 'MULTI_SELECT' ? selectedMulti.has(idx) : selectedOptionIdx === idx;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all text-xs flex items-start gap-2.5 ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : 'border-border/80 bg-card hover:bg-muted/40'
                  }`}
                >
                  {/* Option Badge (A, B, C, D) */}
                  <div
                    className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                    }`}
                  >
                    {label}
                  </div>

                  {/* Option Body */}
                  <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                    {opt.image_url && (
                      <div className="overflow-hidden rounded-md border border-border bg-muted/40 max-h-32 mb-1">
                        <img
                          src={opt.image_url}
                          alt={`Opsi ${label}`}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                    <div className="text-foreground leading-normal font-medium">
                      {opt.content ? (
                        <MathRenderer content={opt.content} />
                      ) : (
                        <span className="text-muted-foreground/50 italic">Pilihan {label}</span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Answer Key Tag Indicator */}
                  {opt.is_correct && (
                    <div className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Kunci
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Essay Input Simulation */}
        {type === 'ESSAY' && (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-3 space-y-1 text-center">
            <span className="text-xs font-semibold text-muted-foreground">Lembar Jawaban Esai Siswa</span>
            <div className="h-20 w-full rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center text-[11px] text-muted-foreground/60 italic">
              Siswa mengetik jawaban esai di sini...
            </div>
          </div>
        )}

        {/* Explanation Preview (if filled) */}
        {explanation && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Pembahasan Guru (Hanya setelah ujian selesai)
            </span>
            <div className="text-[11px] text-foreground leading-relaxed">
              <MathRenderer content={explanation} />
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Perbesar Gambar"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
