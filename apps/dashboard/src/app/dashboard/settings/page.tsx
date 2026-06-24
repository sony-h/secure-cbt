'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/table';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';

interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as SystemSettings[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: { key: string; value: string }) => api.patch('/settings', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan disimpan');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const settingsGroups = [
    {
      title: 'Ujian',
      items: ['EXAM_DEFAULT_DURATION', 'EXAM_MAX_WARNING', 'EXAM_AUTO_SUBMIT'],
    },
    {
      title: 'Sekolah',
      items: ['SCHOOL_NAME', 'SCHOOL_ADDRESS', 'SCHOOL_PHONE'],
    },
    {
      title: 'Sistem',
      items: ['MAX_UPLOAD_SIZE', 'SESSION_TIMEOUT', 'RATE_LIMIT'],
    },
  ];

  const getSettingLabel = (key: string) => {
    const labels: Record<string, string> = {
      EXAM_DEFAULT_DURATION: 'Durasi Default (menit)',
      EXAM_MAX_WARNING: 'Maksimal Peringatan',
      EXAM_AUTO_SUBMIT: 'Auto Submit',
      SCHOOL_NAME: 'Nama Sekolah',
      SCHOOL_ADDRESS: 'Alamat Sekolah',
      SCHOOL_PHONE: 'Telepon Sekolah',
      MAX_UPLOAD_SIZE: 'Ukuran Upload Maks (MB)',
      SESSION_TIMEOUT: 'Timeout Sesi (menit)',
      RATE_LIMIT: 'Rate Limit (req/menit)',
    };
    return labels[key] || key;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">Konfigurasi sistem dan ujian</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="space-y-6">
          {settingsGroups.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-base">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings
                  ?.filter((s) => group.items.includes(s.key))
                  .map((setting) => (
                    <div key={setting.id} className="flex items-end gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>{getSettingLabel(setting.key)}</Label>
                        {setting.description && (
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        )}
                        <Input
                          value={editValues[setting.key] ?? setting.value}
                          onChange={(e) =>
                            setEditValues({ ...editValues, [setting.key]: e.target.value })
                          }
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const val = editValues[setting.key] ?? setting.value;
                          if (val !== setting.value) {
                            updateMutation.mutate({ key: setting.key, value: val });
                          }
                        }}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Simpan
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
