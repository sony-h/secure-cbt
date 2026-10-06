import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date));
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'ONGOING':
    case 'PUBLISHED':
      return 'text-green-600 bg-green-50';
    case 'DRAFT':
      return 'text-yellow-600 bg-yellow-50';
    case 'SUBMITTED':
    case 'FINISHED':
      return 'text-blue-600 bg-blue-50';
    case 'CANCELLED':
    case 'EXPIRED':
    case 'INACTIVE':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    DRAFT: 'Draft',
    PUBLISHED: 'Dipublikasi',
    ONGOING: 'Sedang Berlangsung',
    FINISHED: 'Selesai',
    CANCELLED: 'Dibatalkan',
    SUBMITTED: 'Terkumpul',
    AUTO_SUBMITTED: 'Terkumpul Otomatis',
    EXPIRED: 'Kadaluarsa',
    GRADUATED: 'Lulus',
  };
  return labels[status] || status;
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
