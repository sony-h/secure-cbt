'use client';

import React, { useState, useRef } from 'react';
import { uploadApi } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UploadCloud, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { resolveMediaUrl } from '@/lib/utils';

interface ImageDropzoneProps {
  imageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  label?: string;
  compact?: boolean;
}

export function ImageDropzone({
  imageUrl,
  onImageUploaded,
  onImageRemoved,
  label = 'Unggah Gambar Stimulus / Diagram',
  compact = false,
}: ImageDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP, GIF, SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadImage(file);
      const uploadedUrl = res.data?.data?.url || res.data?.url;
      if (uploadedUrl) {
        onImageUploaded(uploadedUrl);
        toast.success('Gambar berhasil diunggah');
      } else {
        toast.error('Gagal mendapatkan URL gambar');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah gambar');
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
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          handleUpload(file);
          break;
        }
      }
    }
  };

  if (imageUrl) {
    return (
      <div className={`relative rounded-xl border border-border bg-card p-2 flex items-center justify-between gap-3 ${compact ? 'max-w-md' : 'w-full'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Thumbnail */}
          <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-border bg-muted/40">
            <img
              src={resolveMediaUrl(imageUrl)}
              alt="Thumbnail"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
              {imageUrl.split('/').pop()}
            </p>
            <a
              href={resolveMediaUrl(imageUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              Lihat gambar penuh <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onImageRemoved}
          className="text-destructive hover:bg-destructive/10 shrink-0 h-8 px-2"
          title="Hapus gambar"
        >
          <X className="h-4 w-4 mr-1" /> Hapus
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      onClick={() => fileInputRef.current?.click()}
      className={`group cursor-pointer rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center outline-none ${
        isDragging
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
      } ${compact ? 'py-3 px-4' : 'py-5 px-6'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex items-center gap-2 text-primary py-1">
          <Spinner className="h-5 w-5" />
          <span className="text-xs font-semibold">Mengompres & Mengunggah...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 pointer-events-none">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Klik untuk pilih, seret gambar ke sini, atau tempel dari clipboard (<kbd className="px-1 py-0.5 text-[10px] bg-muted rounded border">Ctrl+V</kbd>)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
