'use client';

import React, { useState, useRef } from 'react';
import { uploadApi } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { UploadCloud, X, Headphones, Volume2, Music, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { resolveMediaUrl } from '@/lib/utils';

export interface AudioStimulusFieldProps {
  audioUrl?: string | null;
  playLimit?: number | null;
  onAudioUploaded: (url: string) => void;
  onAudioRemoved: () => void;
  onPlayLimitChange: (limit: number | null) => void;
  disabled?: boolean;
}

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'];
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

export function AudioStimulusField({
  audioUrl,
  playLimit,
  onAudioUploaded,
  onAudioRemoved,
  onPlayLimitChange,
  disabled = false,
}: AudioStimulusFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidAudioFile = (file: File) => {
    if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
    const lowerName = file.name.toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  };

  const handleUpload = async (file: File) => {
    if (disabled || isUploading) return;

    if (!isValidAudioFile(file)) {
      toast.error('Format audio tidak didukung. Harap gunakan format MP3, WAV, M4A, AAC, atau OGG.');
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Ukuran audio maksimal 25MB');
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadAudio(file);
      const uploadedUrl = res.data?.data?.url || res.data?.url;
      if (uploadedUrl) {
        onAudioUploaded(uploadedUrl);
        // Default to standard 2x play limit if not set
        if (playLimit === undefined) {
          onPlayLimitChange(2);
        }
        toast.success('Audio stimulus berhasil diunggah');
      } else {
        toast.error('Gagal mendapatkan URL audio');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah file audio');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const getLimitSelectValue = () => {
    if (playLimit === null) return 'unlimited';
    if (typeof playLimit === 'number') return String(playLimit);
    return '2'; // default
  };

  const handleLimitChange = (value: string) => {
    if (value === 'unlimited') {
      onPlayLimitChange(null);
    } else {
      onPlayLimitChange(Number(value));
    }
  };

  const fileName = audioUrl ? audioUrl.split('/').pop()?.split('?')[0] || 'audio-stimulus.mp3' : '';

  if (audioUrl) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Audio Stimulus Soal
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Siap Diputar
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-md font-mono mt-0.5" title={fileName}>
                {fileName}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAudioRemoved}
            disabled={disabled}
            className="text-destructive hover:bg-destructive/10 shrink-0 h-8 px-2 self-start sm:self-auto"
            title="Hapus audio stimulus"
          >
            <X className="h-4 w-4 mr-1" /> Hapus Audio
          </Button>
        </div>

        {/* Audio Player */}
        <div className="bg-muted/40 rounded-lg p-2.5 border border-border/70 flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-muted-foreground shrink-0 hidden sm:block" />
          <audio
            controls
            src={resolveMediaUrl(audioUrl)}
            className="w-full h-9 outline-none"
            preload="metadata"
          >
            Browser Anda tidak mendukung pemutar audio HTML5.
          </audio>
        </div>

        {/* Play Limit Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
          <div className="sm:col-span-1">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Batas Pemutaran Soal (Play Limit)
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              Maksimal berapa kali audio ini dapat diputar oleh siswa.
            </p>
          </div>

          <div className="sm:col-span-2">
            <Select
              value={getLimitSelectValue()}
              onValueChange={handleLimitChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-full text-xs h-9 bg-background">
                <SelectValue placeholder="Pilih batas pemutaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">
                  1x (Satu kali putar)
                </SelectItem>
                <SelectItem value="2" className="text-xs font-medium">
                  2x (Standar ANBK / TOEFL - Direkomendasikan)
                </SelectItem>
                <SelectItem value="3" className="text-xs">
                  3x (Tiga kali putar)
                </SelectItem>
                <SelectItem value="unlimited" className="text-xs text-muted-foreground">
                  Tanpa Batas (Bebas diputar siswa)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border/80 hover:border-primary/60 hover:bg-muted/30 bg-muted/10'
        } ${disabled || isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/x-m4a,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Spinner className="h-7 w-7 text-primary" />
            <p className="text-xs font-medium text-foreground">Mengunggah audio stimulus...</p>
            <p className="text-[11px] text-muted-foreground">Harap tunggu beberapa saat</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-1.5 space-y-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                <span className="text-primary underline">Klik untuk unggah</span> atau seret file audio ke sini
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Mendukung format MP3, WAV, M4A, AAC, OGG (Maks. 25MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Play limit selector can also be configured in advance if desired */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Batas Pemutaran Soal (Play Limit)
          </Label>
          <span className="text-[11px] text-muted-foreground">
            Standar ANBK / TOEFL: 2x pemutaran
          </span>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={getLimitSelectValue()}
            onValueChange={handleLimitChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full text-xs h-8 bg-background">
              <SelectValue placeholder="Pilih batas pemutaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs">
                1x (Satu kali putar)
              </SelectItem>
              <SelectItem value="2" className="text-xs font-medium">
                2x (Standar ANBK / TOEFL)
              </SelectItem>
              <SelectItem value="3" className="text-xs">
                3x (Tiga kali putar)
              </SelectItem>
              <SelectItem value="unlimited" className="text-xs">
                Tanpa Batas (Bebas diputar)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
