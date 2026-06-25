'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Siswa' : 'Tambah Siswa'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
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
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Pilih Kelas</option>
              {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.major ? ` (${c.major.name})` : ''}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
              <option value="GRADUATED">Lulus</option>
            </select>
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

export default function StudentsPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, classFilter],
    queryFn: async () => {
      const params: any = { page, per_page: 20 };
      if (search) params.search = search;
      if (classFilter) params.class_id = classFilter;
      const res = await api.get('/students', { params });
      return res.data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await api.get('/academic/classes');
      return data.data as ClassOption[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) => editingId ? api.patch(`/students/${editingId}`, dto) : api.post('/students', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(editingId ? 'Siswa diperbarui' : 'Siswa berhasil ditambahkan');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Gagal menyimpan data siswa'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success('Siswa berhasil dihapus'); },
    onError: () => toast.error('Gagal menghapus siswa'),
  });

  const handleSave = () => {
    if (!form.nis.trim()) return toast.error('NIS harus diisi');
    if (!form.full_name.trim()) return toast.error('Nama harus diisi');
    if (!form.class_id) return toast.error('Pilih kelas');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Siswa</h1><p className="text-muted-foreground">Kelola data siswa</p></div>
        {canEdit && <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Tambah Siswa</Button>}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari berdasarkan NIS atau nama..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Kelas</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.major ? ` (${c.major.name})` : ''}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (<div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8" /></div>) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead><TableHead>Nama Lengkap</TableHead><TableHead>Kelas</TableHead><TableHead>Status</TableHead><TableHead>Tanggal Daftar</TableHead><TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.nis}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.class?.name || '-'}</TableCell>
                      <TableCell><Badge variant={student.status === 'ACTIVE' ? 'success' : 'warning'}>{student.status === 'ACTIVE' ? 'Aktif' : student.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(student.created_at)}</TableCell>
                      <TableCell>
                        {canEdit && <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Yakin ingin menghapus siswa ini?')) deleteMutation.mutate(student.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.data || data.data.length === 0) && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada data siswa</TableCell></TableRow>)}
                </TableBody>
              </Table>
              {data?.meta && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Menampilkan {((page - 1) * 20) + 1}-{Math.min(page * 20, data.meta.total)} dari {data.meta.total}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.meta.total_pages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <StudentDialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} form={form} setForm={setForm} classes={classes || []} onSave={handleSave} isEditing={!!editingId} isSaving={saveMutation.isPending} />
    </div>
  );
}
