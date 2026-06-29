'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi, academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableFilter } from '@/components/ui/data-table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface Student {
  id: string;
  nis: string;
  full_name: string;
  class?: { id: string; name: string; major?: { name: string } };
  status: string;
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
}

const emptyForm: StudentForm = { nis: '', full_name: '', class_id: '', status: 'ACTIVE' };

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
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Siswa' : 'Tambah Siswa'}>
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
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    </Modal>
  );
}

function StudentsPageContent() {
  const { user } = useRoleGuard([UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER]);
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => { const res = await studentApi.getAll(); return res.data.data; },
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

  const handleSave = () => {
    if (!form.nis.trim()) { toast.error('NIS harus diisi'); return; }
    if (!form.full_name.trim()) { toast.error('Nama harus diisi'); return; }
    if (!form.class_id) { toast.error('Pilih kelas'); return; }
    const dto: any = { nis: form.nis, full_name: form.full_name, class_id: form.class_id };
    if (editingId) dto.status = form.status;
    saveMutation.mutate(dto);
  };

  const handleEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({ nis: s.nis, full_name: s.full_name, class_id: s.class?.id || '', status: s.status });
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
        <div><h1 className="text-3xl font-bold tracking-tight">Siswa</h1><p className="text-muted-foreground">Kelola data siswa</p></div>
        {canEdit && <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Tambah Siswa</Button>}
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={studentColumns}
            data={students || []}
            searchKey="full_name"
            searchPlaceholder="Cari berdasarkan NIS atau nama..."
            filters={canEdit ? [classFilterOpts] : undefined}
            emptyMessage="Belum ada data siswa"
          />
        </CardContent>
      </Card>
      <StudentDialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} form={form} setForm={setForm} classes={classes || []} onSave={handleSave} isEditing={!!editingId} isSaving={saveMutation.isPending} />
    </div>
  );
}

export default function StudentsPage() {
  return <ErrorBoundary><StudentsPageContent /></ErrorBoundary>;
}
