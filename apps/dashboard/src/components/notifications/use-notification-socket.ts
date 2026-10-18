'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import {
  pushDashboardNotification,
  type DashboardNotification,
} from './notification-bell';

export type NotificationPusher = (
  notif: Omit<DashboardNotification, 'id' | 'timestamp' | 'read'>,
) => void;

export function handleMonitoringSocketEvent(
  event: string,
  data: any,
  pusher: NotificationPusher = pushDashboardNotification,
) {
  if (!data) return;

  switch (event) {
    case 'warning.triggered': {
      const studentName = data.studentName || 'Siswa';
      const eventType = data.event || 'Pelanggaran';
      const count = data.count || data.warningCount || 1;
      pusher({
        title: `Pelanggaran: ${studentName}`,
        message: `Terdeteksi indikasi ${eventType} (Peringatan ke-${count}) pada sesi ujian.`,
        type: 'warning',
      });
      break;
    }

    case 'exam.submitted': {
      const studentName = data.studentName || 'Siswa';
      pusher({
        title: 'Ujian Diselesaikan',
        message: `${studentName} telah menyelesaikan dan mengirimkan lembar jawaban ujian.`,
        type: 'success',
      });
      break;
    }

    case 'session.force_submit': {
      const studentName = data.studentName ? `siswa ${data.studentName}` : 'siswa';
      pusher({
        title: 'Sesi Dihentikan',
        message: `Sesi ujian ${studentName} otomatis dihentikan/disubmit oleh pengawas atau sistem.`,
        type: 'danger',
      });
      break;
    }

    case 'exam.broadcast': {
      const message = data.message || 'Pesan siaran baru dari pengawas ujian.';
      pusher({
        title: 'Pengumuman Pengawas',
        message,
        type: data.urgency === 'high' ? 'warning' : 'info',
      });
      break;
    }

    default:
      break;
  }
}

export function useNotificationSocket() {
  const socketRef = useRef<Socket | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated || !user || typeof window === 'undefined') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000';
    const baseUrl = socketUrl.replace(/\/api\/v1\/?$/, '');

    const socket = io(`${baseUrl}/monitoring`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('warning.triggered', (data) =>
      handleMonitoringSocketEvent('warning.triggered', data),
    );
    socket.on('exam.submitted', (data) =>
      handleMonitoringSocketEvent('exam.submitted', data),
    );
    socket.on('session.force_submit', (data) =>
      handleMonitoringSocketEvent('session.force_submit', data),
    );
    socket.on('exam.broadcast', (data) =>
      handleMonitoringSocketEvent('exam.broadcast', data),
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);
}
