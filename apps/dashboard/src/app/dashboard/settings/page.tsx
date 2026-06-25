'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/table';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';

interface SettingsData {
  id: string;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
  lock_task_mode: boolean;
  autosave_interval: number;
  session_timeout: number;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as SettingsData;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.patch('/settings', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan disimpan');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  if (isLoading || !settings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">Konfigurasi sistem dan ujian</p>
        </div>
      </div>

      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Keamanan Ujian</CardTitle>
          <CardDescription>Konfigurasi batas peringatan, fullscreen, dan auto-submit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            label="Batas Peringatan"
            description="Jumlah maksimal pelanggaran sebelum ujian otomatis dikumpulkan"
            value={settings.warning_limit}
            type="number"
            min={1}
            max={10}
            onSave={(val) => updateMutation.mutate({ warning_limit: Number(val) })}
            disabled={updateMutation.isPending}
          />
          <SettingRow
            label="Interval Auto-Save (detik)"
            description="Seberapa sering jawaban siswa disimpan otomatis"
            value={settings.autosave_interval}
            type="number"
            min={1}
            max={60}
            onSave={(val) => updateMutation.mutate({ autosave_interval: Number(val) })}
            disabled={updateMutation.isPending}
          />
          <SettingRow
            label="Timeout Sesi (menit)"
            description="Waktu maksimal idle sebelum sesi dianggap expired"
            value={settings.session_timeout}
            type="number"
            min={5}
            max={120}
            onSave={(val) => updateMutation.mutate({ session_timeout: Number(val) })}
            disabled={updateMutation.isPending}
          />
          <SettingToggle
            label="Auto Submit"
            description="Kumpulkan ujian otomatis saat batas peringatan terlampaui"
            value={settings.auto_submit_enabled}
            onSave={(val) => updateMutation.mutate({ auto_submit_enabled: val })}
            disabled={updateMutation.isPending}
          />
          <SettingToggle
            label="Wajib Fullscreen"
            description="Siswa harus dalam mode layar penuh selama ujian"
            value={settings.fullscreen_required}
            onSave={(val) => updateMutation.mutate({ fullscreen_required: val })}
            disabled={updateMutation.isPending}
          />
          <SettingToggle
            label="Lock Task Mode"
            description="Kunci perangkat dalam mode ujian (Android kiosk)"
            value={settings.lock_task_mode}
            onSave={(val) => updateMutation.mutate({ lock_task_mode: val })}
            disabled={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Last saved info */}
      <p className="text-xs text-muted-foreground text-right">
        Terakhir diperbarui: {new Date(settings.updated_at).toLocaleString('id-ID')}
      </p>
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  type,
  min,
  max,
  onSave,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  type: 'number';
  min?: number;
  max?: number;
  onSave: (value: string) => void;
  disabled: boolean;
}) {
  const [current, setCurrent] = useState(String(value));

  useEffect(() => {
    setCurrent(String(value));
  }, [value]);

  const changed = String(value) !== current;

  return (
    <div className="flex items-end gap-4">
      <div className="flex-1 space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Input
          type={type}
          min={min}
          max={max}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        {changed && (
          <Button variant="ghost" size="icon" onClick={() => setCurrent(String(value))} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => { if (changed) onSave(current); }}
          disabled={disabled || !changed}
        >
          <Save className="mr-1 h-3 w-3" />
          Simpan
        </Button>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onSave,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onSave: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        variant={value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSave(!value)}
        disabled={disabled}
      >
        {value ? 'Aktif' : 'Nonaktif'}
      </Button>
    </div>
  );
}
