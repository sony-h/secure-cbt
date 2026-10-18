'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  CheckCheck,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'cbt_dashboard_notifications';
export const NOTIFICATION_EVENT = 'cbt:dashboard_notification_push';

export function pushDashboardNotification(
  notif: Omit<DashboardNotification, 'id' | 'timestamp' | 'read'>,
) {
  if (typeof window === 'undefined') return;
  const newNotification: DashboardNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, { detail: newNotification }),
  );
}

export const DEFAULT_NOTIFICATIONS: DashboardNotification[] = [
  {
    id: 'notif-default-1',
    title: 'Sistem CBT Aktif',
    message: 'Server pemantauan realtime siap memonitor sesi ujian.',
    type: 'info',
    timestamp: new Date().toISOString(),
    read: false,
  },
];

interface NotificationBellProps {
  initialNotifications?: DashboardNotification[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationBell({ initialNotifications, open, onOpenChange }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<DashboardNotification[]>(() => {
    if (initialNotifications) return initialNotifications;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error('Failed to parse notifications from storage', e);
      }
    }
    return DEFAULT_NOTIFICATIONS;
  });

  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePush = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardNotification>;
      if (!customEvent.detail) return;
      setNotifications((prev) => {
        const next = [customEvent.detail, ...prev.slice(0, 49)];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (err) {
          console.error('Failed to save notification', err);
        }
        return next;
      });
    };

    window.addEventListener(NOTIFICATION_EVENT, handlePush);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, handlePush);
    };
  }, []);

  const saveNotifications = (items: DashboardNotification[]) => {
    setNotifications(items);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save notifications', e);
      }
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderIcon = (type: DashboardNotification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'danger':
        return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifikasi"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              data-testid="notification-badge"
              className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in-50"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifikasi</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-primary/10 text-primary rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Tandai dibaca
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                title="Bersihkan semua"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Bersihkan
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                <BellOff className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Tidak ada notifikasi</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
                Aktivitas penting dan pelanggaran ujian akan muncul di sini.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`flex gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                  item.read
                    ? 'hover:bg-muted/40 opacity-75'
                    : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                <div className="mt-0.5">{renderIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${item.read ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
                {!item.read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/20 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/monitoring')}
            className="w-full h-8 text-xs font-semibold text-primary hover:text-primary/90 justify-center"
          >
            Buka Panel Pemantauan Realtime
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
