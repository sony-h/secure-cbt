'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi, academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type PageSizeOption } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Mail, UserCheck, UserX, Send, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface Teacher {
  id: string;
  nip: string | null;
  full_name: string;
  can_monitor_all_subjects?: boolean;
  teacher_subjects?: { id?: string; subject: { id: string; name: string } }[];
  user?: {
    id: string;
    username: string;
    email: string;
    is_active: boolean;
    email_verified_at: string | null;
  };
  created_at: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherForm {
  nip: string;
  full_name: string;
  subject_ids: string[];
  can_monitor_all_subjects: boolean;
}

const emptyForm: TeacherForm = { nip: '', full_name: '', subject_ids: [], can_monitor_all_subjects: false };

function TeacherDialog({
  open,
  onClose,
  form,
  setForm,
  subjects,
  onSave,
  isEditing,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  form: TeacherForm;
  setForm: (f: TeacherForm) => void;
  subjects: SubjectOption[];
  onSave: () => void;
  isEditing: boolean;
  isSaving: boolean;
}) {
  const toggleSubject = (id: string) => {
    const ids = form.subject_ids.includes(id) ? form.subject_ids.filter((i) => i !== id) : [...form.subject_ids, id];
    setForm({ ...form, subject_ids: ids });
  };
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Guru' : 'Tambah Guru'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>NIP / NIY <span className="text-muted-foreground font-normal text-xs">(Opsional)</span></Label>
          <Input
            value={form.nip}
            onChange={(e) => setForm({ ...form, nip: e.target.value })}
            placeholder="Nomor Induk Pegawai / Yayasan (opsional)"
            disabled={isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label>Nama Lengkap</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama lengkap guru" />
        </div>
        <div className="space-y-2">
          <Label>Mata Pelajaran yang Diampu</Label>
          <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
            {subjects.map((s) => (
              <label key={s.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted text-sm ${form.subject_ids.includes(s.id) ? 'bg-primary/5 border border-primary/30' : ''}`}>
                <Checkbox checked={form.subject_ids.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                <span>{s.name} <span className="text-muted-foreground text-xs">({s.code})</span></span>
              </label>
            ))}
            {subjects.length === 0 && <p className="text-sm text-muted-foreground p-2">Belum ada mata pelajaran</p>}
          </div>
        </div>

        {/* Proctor Access (Pengawas) Toggle */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 space-y-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={form.can_monitor_all_subjects}
              onCheckedChange={(checked) => setForm({ ...form, can_monitor_all_subjects: !!checked })}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Akses Pengawas Semua Mapel (Proctor Access)
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jika diaktifkan, guru dapat memantau ujian live dan melihat laporan ujian seluruh mata pelajaran. Bank soal, buat ujian, dan penilaian esai tetap terbatas pada mapel yang diampu.
              </p>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
}

function InviteTeacherDialog({
  open,
  onClose,
  subjects,
  onInvite,
  isInviting,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  onInvite: (email: string, subjectIds: string[], canMonitorAllSubjects: boolean) => void;
  isInviting: boolean;
}) {
  const [email, setEmail] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [canMonitorAllSubjects, setCanMonitorAllSubjects] = useState(false);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSend = () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Masukkan alamat email yang valid');
      return;
    }
    onInvite(email.trim().toLowerCase(), selectedSubjects, canMonitorAllSubjects);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Undang Guru Baru"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSend} disabled={isInviting}>
            {isInviting ? <Spinner className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim Undangan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sistem akan mengirimkan email undangan resmi berisi tautan aktivasi akun guru. Email yang diundang akan otomatis terverifikasi.
        </p>
        <div className="space-y-2">
          <Label>Alamat Email Guru</Label>
          <Input
            type="email"
            placeholder="guru@sekolah.sch.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label>Mata Pelajaran yang Diampu <span className="text-muted-foreground text-xs font-normal">(Opsional)</span></Label>
          <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
            {subjects.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted text-sm ${
                  selectedSubjects.includes(s.id) ? 'bg-primary/5 border border-primary/30' : ''
                }`}
              >
                <Checkbox
                  checked={selectedSubjects.includes(s.id)}
                  onCheckedChange={() => toggleSubject(s.id)}
                />
                <span>
                  {s.name} <span className="text-muted-foreground text-xs">({s.code})</span>
                </span>
              </label>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Belum ada mata pelajaran</p>
            )}
          </div>
        </div>
        {/* Proctor Access Toggle */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 space-y-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={canMonitorAllSubjects}
              onCheckedChange={(checked) => setCanMonitorAllSubjects(!!checked)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Akses Pengawas Semua Mapel (Proctor Access)
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Guru yang diundang akan dapat memantau ujian live dan melihat laporan ujian seluruh mata pelajaran.
              </p>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
}

function TeachersPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.OPERATOR]);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get('page')) || 1;
  const rawLimit = searchParams.get('limit');
  const initialLimit: PageSizeOption = rawLimit === 'all' ? 'all' : Number(rawLimit) || 10;
  const initialSearch = searchParams.get('q') || '';

  const updateUrlParams = (params: Record<string, string | number | null | undefined>) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, String(v));
      }
    });
    window.history.replaceState(null, '', url.toString());
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => { const res = await teacherApi.getAll({ per_page: 200 }); return res.data.data; },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => { const { data } = await academicApi.getSubjects(); return data.data as SubjectOption[]; },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) => editingId ? teacherApi.update(editingId, dto) : teacherApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(editingId ? 'Guru diperbarui' : 'Guru berhasil ditambahkan');
      setModalOpen(false); setEditingId(null); setForm(emptyForm);
    },
    onError: () => toast.error('Gagal menyimpan data guru'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Guru berhasil dihapus'); },
    onError: () => toast.error('Gagal menghapus guru'),
  });

  const inviteMutation = useMutation({
    mutationFn: (dto: { email: string; subject_ids: string[]; can_monitor_all_subjects?: boolean }) =>
      teacherApi.invite(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Undangan email berhasil dikirim ke guru');
      setInviteModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengirim email undangan');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      teacherApi.toggleStatus(id, { is_active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(vars.is_active ? 'Akun guru telah diaktifkan' : 'Akun guru telah ditangguhkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status akun');
    },
  });

  const handleSave = () => {
    if (!form.full_name.trim()) { toast.error('Nama harus diisi'); return; }
    saveMutation.mutate({
      nip: form.nip.trim() || null,
      full_name: form.full_name,
      subject_ids: form.subject_ids,
      can_monitor_all_subjects: form.can_monitor_all_subjects,
    });
  };

  const handleEdit = (t: Teacher) => {
    setEditingId(t.id);
    setForm({
      nip: t.nip || '',
      full_name: t.full_name,
      subject_ids: t.teacher_subjects?.map((ts) => ts.subject.id) || [],
      can_monitor_all_subjects: !!t.can_monitor_all_subjects,
    });
    setModalOpen(true);
  };

  const handleAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const teacherColumns: ColumnDef<any>[] = [
    { accessorKey: 'nip', header: 'NIP / NIY', enableSorting: true, cell: ({ row }) => <span className="font-medium">{row.original.nip || '-'}</span> },
    { accessorKey: 'full_name', header: 'Nama Lengkap', enableSorting: true },
    {
      accessorKey: 'user.email',
      header: 'Email / Akun',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.user?.email || '-'}</span>
      ),
    },
    { accessorKey: 'teacher_subjects', header: 'Mata Pelajaran', cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.teacher_subjects?.map((ts: any) => <Badge key={ts.id || ts.subject?.id} variant="secondary">{ts.subject?.name}</Badge>)}
      </div>
    )},
    {
      id: 'proctor_access',
      header: 'Peran Khusus',
      cell: ({ row }: any) => {
        if (row.original.can_monitor_all_subjects) {
          return (
            <Badge
              variant="outline"
              className="border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 w-fit"
            >
              <ShieldCheck className="h-3 w-3" />
              Pengawas (Semua Mapel)
            </Badge>
          );
        }
        return <span className="text-xs text-muted-foreground">Standar</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status Akun',
      cell: ({ row }: any) => {
        const u = row.original.user;
        if (!u) return <Badge variant="outline">-</Badge>;
        if (!u.is_active) {
          return (
            <Badge variant="destructive" className="whitespace-nowrap">
              Nonaktif
            </Badge>
          );
        }
        if (!u.email_verified_at) {
          return (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 dark:border-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 whitespace-nowrap"
            >
              Belum Verifikasi
            </Badge>
          );
        }
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap">
            Aktif
          </Badge>
        );
      },
    },
    { accessorKey: 'created_at', header: 'Tanggal Daftar', enableSorting: true, cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: any) => {
        const u = row.original.user;
        const isActive = u ? u.is_active : true;

        return (
          <div className="flex items-center gap-1">
            {u && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={isActive ? 'Tangguhkan / Nonaktifkan Akun' : 'Aktifkan Akun Guru'}
                  >
                    {isActive ? (
                      <UserX className="h-4 w-4 text-amber-600" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isActive ? 'Tangguhkan Akun Guru' : 'Aktifkan Akun Guru'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isActive
                        ? `Yakin ingin menangguhkan akun guru "${row.original.full_name}"? Guru ini tidak akan dapat login ke dashboard.`
                        : `Aktifkan kembali akun guru "${row.original.full_name}" agar dapat login dan mengelola ujian?`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: row.original.id,
                          is_active: !isActive,
                        })
                      }
                    >
                      {isActive ? 'Tangguhkan' : 'Aktifkan'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Guru">
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Hapus Guru">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Guru</AlertDialogTitle>
                  <AlertDialogDescription>
                    Yakin ingin menghapus guru ini? Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guru</h1>
          <p className="text-muted-foreground">Kelola data guru, mata pelajaran, dan aktivasi akun pengajar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setInviteModalOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Undang Guru
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Guru
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={teacherColumns}
            data={teachers || []}
            searchKey="full_name"
            searchPlaceholder="Cari berdasarkan NIP atau nama..."
            pageSize={initialLimit === 'all' ? 10 : Number(initialLimit) || 10}
            initialPage={initialPage}
            initialSearch={initialSearch}
            onStateChange={({ page, pageSize, search }) => {
              updateUrlParams({
                page,
                limit: pageSize,
                q: search || null,
              });
            }}
            loading={isLoading}
            emptyMessage="Belum ada data guru"
          />
        </CardContent>
      </Card>
      <TeacherDialog
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        form={form}
        setForm={setForm}
        subjects={subjects || []}
        onSave={handleSave}
        isEditing={!!editingId}
        isSaving={saveMutation.isPending}
      />
      <InviteTeacherDialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        subjects={subjects || []}
        onInvite={(email, subjectIds, canMonitorAllSubjects) =>
          inviteMutation.mutate({
            email,
            subject_ids: subjectIds,
            can_monitor_all_subjects: canMonitorAllSubjects,
          })
        }
        isInviting={inviteMutation.isPending}
      />
    </div>
  );
}

export default function TeachersPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary" /></div>}>
        <TeachersPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
