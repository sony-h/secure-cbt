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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Teacher {
  id: string;
  nip: string;
  full_name: string;
  teacher_subjects?: { subject: { id: string; name: string } }[];
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
}

const emptyForm: TeacherForm = { nip: '', full_name: '', subject_ids: [] };

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
  if (!open) return null;
  const toggleSubject = (id: string) => {
    const ids = form.subject_ids.includes(id) ? form.subject_ids.filter((i) => i !== id) : [...form.subject_ids, id];
    setForm({ ...form, subject_ids: ids });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Guru' : 'Tambah Guru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>NIP</Label>
            <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="Nomor Induk Pegawai" disabled={isEditing} />
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
                  <input type="checkbox" checked={form.subject_ids.includes(s.id)} onChange={() => toggleSubject(s.id)} />
                  <span>{s.name} <span className="text-muted-foreground text-xs">({s.code})</span></span>
                </label>
              ))}
              {subjects.length === 0 && <p className="text-sm text-muted-foreground p-2">Belum ada mata pelajaran</p>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambah'}</Button>
        </div>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && ![UserRole.ADMIN, UserRole.OPERATOR].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data.data;
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/academic/subjects');
      return data.data as SubjectOption[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) => editingId ? api.patch(`/teachers/${editingId}`, dto) : api.post('/teachers', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(editingId ? 'Guru diperbarui' : 'Guru berhasil ditambahkan');
      setModalOpen(false); setEditingId(null); setForm(emptyForm);
    },
    onError: () => toast.error('Gagal menyimpan data guru'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Guru berhasil dihapus'); },
    onError: () => toast.error('Gagal menghapus guru'),
  });

  const handleSave = () => {
    if (!form.nip.trim()) return toast.error('NIP harus diisi');
    if (!form.full_name.trim()) return toast.error('Nama harus diisi');
    saveMutation.mutate({ nip: form.nip, full_name: form.full_name, subject_ids: form.subject_ids });
  };

  const handleEdit = (t: Teacher) => {
    setEditingId(t.id);
    setForm({ nip: t.nip, full_name: t.full_name, subject_ids: t.teacher_subjects?.map((ts) => ts.subject.id) || [] });
    setModalOpen(true);
  };

  const handleAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const teacherColumns: ColumnDef<any>[] = [
    { accessorKey: 'nip', header: 'NIP', enableSorting: true, cell: ({ row }) => <span className="font-medium">{row.original.nip}</span> },
    { accessorKey: 'full_name', header: 'Nama Lengkap', enableSorting: true },
    { accessorKey: 'teacher_subjects', header: 'Mata Pelajaran', cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.teacher_subjects?.map((ts: any) => <Badge key={ts.id} variant="secondary">{ts.subject?.name}</Badge>)}
      </div>
    )},
    { accessorKey: 'created_at', header: 'Tanggal Daftar', enableSorting: true, cell: ({ row }) => formatDate(row.original.created_at) },
    { id: 'actions', header: 'Aksi', cell: ({ row }: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus guru ini?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Guru</h1><p className="text-muted-foreground">Kelola data guru dan mata pelajaran yang diampu</p></div>
        <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Tambah Guru</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={teacherColumns}
            data={teachers || []}
            searchKey="full_name"
            searchPlaceholder="Cari berdasarkan NIP atau nama..."
            emptyMessage="Belum ada data guru"
          />
        </CardContent>
      </Card>
      <TeacherDialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} form={form} setForm={setForm} subjects={subjects || []} onSave={handleSave} isEditing={!!editingId} isSaving={saveMutation.isPending} />
    </div>
  );
}
