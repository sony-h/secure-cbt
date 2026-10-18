'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi, academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole, generateClassPassword } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableFilter, type PageSizeOption } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, FileDown, KeyRound, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { StudentExportDialog } from '@/components/students/student-export-dialog';

interface Student {
  id: string;
  nis: string;
  full_name: string;
  class?: { id: string; name: string; major?: { name: string } };
  status: string;
  plain_password?: string | null;
  created_at: string;
}

interface ClassOption {
  id: string;
  name: string;
  major?: { name: string };
}

interface StudentForm {
  nis: string;
  full_name: string;
  class_id: string;
  status: string;
  password?: string;
}

const emptyForm: StudentForm = { nis: '', full_name: '', class_id: '', status: 'ACTIVE', password: '' };

function StudentDialog({
  open,
  onClose,
  form,
  setForm,
  classes,
  onSave,
  isEditing,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  form: StudentForm;
  setForm: (f: StudentForm) => void;
  classes: ClassOption[];
  onSave: () => void;
  isEditing: boolean;
  isSaving: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Siswa' : 'Tambah Siswa'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>NIS</Label>
          <Input value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} placeholder="Nomor Induk Siswa" disabled={isEditing} />
        </div>
        <div className="space-y-2">
          <Label>Nama Lengkap</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama lengkap siswa" />
        </div>
        <div className="space-y-2">
          <Label>Kelas</Label>
          <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.major ? ` (${c.major.name})` : ''}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Password Akun</Label>
            {form.class_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary px-2 hover:bg-primary/10"
                onClick={() => {
                  const targetCls = classes.find((c) => c.id === form.class_id);
                  const generated = generateClassPassword(targetCls?.name || 'CBT');
                  setForm({ ...form, password: generated });
                }}
              >
                <KeyRound className="mr-1 h-3 w-3" />
                Format Kelas
              </Button>
            )}
          </div>
          <Input
            value={form.password || ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={isEditing ? 'Kosongkan jika password tidak diubah' : 'Otomatis NIS jika dikosongkan'}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              <SelectItem value="GRADUATED">Lulus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  );
}

function StudentsPageContent() {
  const { user } = useRoleGuard([UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER]);
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchClassId, setBatchClassId] = useState<string>('');

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => { const res = await studentApi.getAll({ per_page: 500 }); return res.data.data; },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => { const { data } = await academicApi.getClasses(); return data.data as ClassOption[]; },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) => editingId ? studentApi.update(editingId, dto) : studentApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(editingId ? 'Siswa diperbarui' : 'Siswa berhasil ditambahkan');
      setModalOpen(false); setEditingId(null); setForm(emptyForm);
    },
    onError: () => toast.error('Gagal menyimpan data siswa'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success('Siswa berhasil dihapus'); },
    onError: () => toast.error('Gagal menghapus siswa'),
  });

  const batchMutation = useMutation({
    mutationFn: (dto: { class_id: string }) => studentApi.batchGeneratePasswords(dto),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`Berhasil generate password untuk ${res.data?.data?.count || 0} siswa`);
      setBatchModalOpen(false);
      setBatchClassId('');
    },
    onError: () => toast.error('Gagal generate password kelas'),
  });

  const handleExportExcel = async (options: { class_id?: string; student_ids?: string[] }) => {
    try {
      const res = await studentApi.exportExcel(options);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Kredensial_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('File Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh file Excel');
    }
  };

  const handleSave = () => {
    if (!form.nis.trim()) { toast.error('NIS harus diisi'); return; }
    if (!form.full_name.trim()) { toast.error('Nama harus diisi'); return; }
    if (!form.class_id) { toast.error('Pilih kelas'); return; }
    const dto: any = { nis: form.nis, full_name: form.full_name, class_id: form.class_id };
    if (form.password && form.password.trim()) {
      dto.password = form.password.trim();
    }
    if (editingId) dto.status = form.status;
    saveMutation.mutate(dto);
  };

  const handleEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({
      nis: s.nis,
      full_name: s.full_name,
      class_id: s.class?.id || '',
      status: s.status,
      password: s.plain_password || '',
    });
    setModalOpen(true);
  };

  const handleAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const classFilterOpts: DataTableFilter = {
    column: 'className',
    label: 'Semua Kelas',
    options: (classes || []).map((c: any) => ({ value: c.name, label: c.name })),
  };

  const studentColumns: ColumnDef<any>[] = [
    { accessorKey: 'nis', header: 'NIS', enableSorting: true, cell: ({ row }) => <span className="font-medium">{row.original.nis}</span> },
    { accessorKey: 'full_name', header: 'Nama Lengkap', enableSorting: true },
    { id: 'className', accessorFn: (row: any) => row.class?.name, header: 'Kelas', filterFn: 'equalsString', cell: ({ row }: any) => row.original.class?.name || '-' },
    {
      accessorKey: 'plain_password',
      header: 'Password Akun',
      cell: ({ row }) => {
        const pw = row.original.plain_password;
        if (!pw) return <span className="text-muted-foreground text-xs italic">Sama NIS</span>;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded w-fit">
            <span>{pw}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(pw);
                toast.success('Password disalin ke clipboard');
              }}
              className="hover:text-primary transition-colors p-0.5"
              title="Salin Password"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        );
      },
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant={status === 'ACTIVE' ? 'success' : status === 'GRADUATED' ? 'default' : 'warning'}>{status === 'ACTIVE' ? 'Aktif' : status === 'GRADUATED' ? 'Lulus' : 'Nonaktif'}</Badge>;
      },
    },
    { accessorKey: 'created_at', header: 'Tanggal Daftar', enableSorting: true, cell: ({ row }) => formatDate(row.original.created_at) },
    ...(canEdit ? [{
      id: 'actions' as const,
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Siswa</AlertDialogTitle>
                <AlertDialogDescription>Yakin ingin menghapus siswa ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Siswa</h1>
          <p className="text-muted-foreground">Kelola data siswa, kredensial akun, dan ekspor dokumen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
            disabled={isLoading || !students || students.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Ekspor Siswa (Excel / PDF)
          </Button>
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => setBatchModalOpen(true)}
                disabled={isLoading || !classes || classes.length === 0}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Generate Password Kelas
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Siswa
              </Button>
            </>
          )}
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={studentColumns}
            data={students || []}
            searchKey="full_name"
            searchPlaceholder="Cari berdasarkan NIS atau nama..."
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
            filters={canEdit ? [classFilterOpts] : undefined}
            loading={isLoading}
            emptyMessage="Belum ada data siswa"
          />
        </CardContent>
      </Card>

      <StudentDialog
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        form={form}
        setForm={setForm}
        classes={classes || []}
        onSave={handleSave}
        isEditing={!!editingId}
        isSaving={saveMutation.isPending}
      />

      <StudentExportDialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        students={students || []}
        classes={classes || []}
        onExportExcel={handleExportExcel}
      />

      <Modal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Generate Password Format Kelas"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBatchModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => batchClassId && batchMutation.mutate({ class_id: batchClassId })}
              disabled={batchMutation.isPending || !batchClassId}
            >
              {batchMutation.isPending ? 'Memproses...' : 'Generate Password'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sistem akan men-generate password baru dengan format prefix kelas (contoh: <code>AKL-xxxxxx</code> untuk kelas X AKL) untuk semua siswa di kelas yang dipilih. Password langsung aktif untuk login CBT.
          </p>
          <div className="space-y-2">
            <Label>Pilih Kelas Sasaran</Label>
            <Select value={batchClassId} onValueChange={setBatchClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Kelas Target" />
              </SelectTrigger>
              <SelectContent>
                {(classes || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary" /></div>}>
        <StudentsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
