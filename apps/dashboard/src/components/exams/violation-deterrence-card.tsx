'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ShieldAlert, BellRing, Smartphone, Volume2, Timer } from 'lucide-react';
import type { ExamFormData } from './create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
}

export function ViolationDeterrenceCard({ form, setForm }: Props) {
  const isVibrationEnabled = form.violation_vibration_enabled ?? true;
  const isAlarmEnabled = form.violation_alarm_enabled ?? true;
  const durationSeconds = form.violation_alarm_duration_seconds ?? 3;
  const alarmSound = form.violation_alarm_sound || 'sharp_beep';

  const handleVibrationToggle = (checked: boolean) => {
    setForm({
      ...form,
      violation_vibration_enabled: checked,
    });
  };

  const handleAlarmToggle = (checked: boolean) => {
    setForm({
      ...form,
      violation_alarm_enabled: checked,
    });
  };

  const handleDurationChange = (value: string) => {
    setForm({
      ...form,
      violation_alarm_duration_seconds: Number(value),
    });
  };

  const handleSoundChange = (value: string) => {
    setForm({
      ...form,
      violation_alarm_sound: value,
    });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <h4 className="text-sm font-semibold text-foreground">
              Pengaturan Alarm & Getar Pelanggaran (Security Deterrence)
            </h4>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 text-amber-600 border-amber-500/30 bg-amber-500/10">
              Efek Jera
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Memberikan efek jera fisik & suara langsung di perangkat siswa ketika melakukan pelanggaran (keluar layar, split screen, floating apps).
          </p>
        </div>
      </div>

      {/* Vibration Switch */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary shrink-0" />
            <Label htmlFor="vibration-switch" className="text-sm font-medium cursor-pointer">
              Getar HP Saat Terjadi Pelanggaran
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Ponsel siswa akan bergetar kencang secara fisik saat terdeteksi kecurangan.
          </p>
        </div>
        <Switch
          id="vibration-switch"
          checked={isVibrationEnabled}
          onCheckedChange={handleVibrationToggle}
        />
      </div>

      {/* Sound Alarm Switch */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary shrink-0" />
            <Label htmlFor="alarm-switch" className="text-sm font-medium cursor-pointer">
              Bunyikan Alarm Suara Saat Terjadi Pelanggaran
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Ponsel siswa akan membunyikan alarm suara peringatan keras seketika di ruangan ujian.
          </p>
        </div>
        <Switch
          id="alarm-switch"
          checked={isAlarmEnabled}
          onCheckedChange={handleAlarmToggle}
        />
      </div>

      {/* Duration and Sound Selector (when alarm is enabled) */}
      {isAlarmEnabled && (
        <div className="pt-2 border-t border-border/60 space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                Durasi Alarm Pelanggaran
              </Label>
              <Select
                value={String(durationSeconds)}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Pilih durasi alarm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3" className="text-xs">
                    3 Detik (Kejutan Singkat)
                  </SelectItem>
                  <SelectItem value="5" className="text-xs">
                    5 Detik (Peringatan Keras)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Alarm berhenti otomatis setelah durasi tercapai agar tidak mengganggu seisi ruangan secara berkepanjangan.
              </p>
            </div>

            {/* Sound Tone Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                Pilihan Nada Alarm (Tone)
              </Label>
              <Select
                value={alarmSound}
                onValueChange={handleSoundChange}
              >
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Pilih nada alarm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharp_beep" className="text-xs font-medium">
                    Bip Keras (Sharp Treble)
                  </SelectItem>
                  <SelectItem value="siren" className="text-xs">
                    Sirine Polisi (Fast Siren)
                  </SelectItem>
                  <SelectItem value="digital_pulse" className="text-xs">
                    Alarm Digital (Digital Pulse)
                  </SelectItem>
                  <SelectItem value="warning_radar" className="text-xs">
                    Denyut Radar (Warning Radar)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                File audio alarm offline tertanam langsung pada aplikasi siswa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
