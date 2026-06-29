'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2, School, BookOpen, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';

interface MajorOption { id: string; name: string; code: string; }
interface YearOption { id: string; name: string; is_active: boolean; }
interface ClassOption { id: string; name: string; major?: { name: string }; grade_level: number; }

function YearDialog({ open, onClose, onSave, isEditing, initialName, initialActive }: {
  open: boolean; onClose: () => void; onSave: (name: string, isActive: boolean) => void;
  isEditing: boolean; initialName?: string; initialActive?: boolean;
}) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    if (open) { setName(initialName || ''); setIsActive(initialActive || false); }
  }, [open, initialName, initialActive]);
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Tahun Ajaran</Label><Input placeholder="contoh: 2026/2027" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <label className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm">Jadikan tahun ajaran aktif</span>
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (name.trim()) { onSave(name, isActive); } else toast.error('Nama harus diisi'); }}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    </Modal>
  );
}

function MajorDialog({ open, onClose, onSave, isEditing, initialName, initialCode }: {
  open: boolean; onClose: () => void; onSave: (name: string, code: string) => void;
  isEditing: boolean; initialName?: string; initialCode?: string;
}) {
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  useEffect(() => {
    if (open) { setName(initialName || ''); setCode(initialCode || ''); }
  }, [open, initialName, initialCode]);
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Jurusan' : 'Tambah Jurusan'}>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Jurusan</Label><Input placeholder="contoh: MIPA" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Kode Jurusan</Label><Input placeholder="contoh: MIPA" value={code} onChange={(e) => setCode(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (name.trim() && code.trim()) { onSave(name, code); } else toast.error('Nama dan kode harus diisi'); }}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    </Modal>
  );
}

function ClassDialog({ open, onClose, form, setForm, majors, years, onSave, isEditing }: {
  open: boolean; onClose: () => void;
  form: { name: string; major_id: string; academic_year_id: string; grade_level: number };
  setForm: (f: any) => void;
  majors: MajorOption[]; years: YearOption[];
  onSave: () => void; isEditing: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Kelas' : 'Tambah Kelas'}>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Kelas</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: XII MIPA 1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Jurusan</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.major_id} onChange={(e) => setForm({ ...form, major_id: e.target.value })}>
              <option value="">Pilih</option>{majors.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
          <div className="space-y-2"><Label>Tingkat</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: Number(e.target.value) })}>
              <option value={10}>10</option><option value={11}>11</option><option value={12}>12</option>
            </select>
          </div>
        </div>
        <div className="space-y-2"><Label>Tahun Ajaran</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}>
            <option value="">Pilih</option>{years.map((y) => (<option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    </Modal>
  );
}

function SubjectDialog({ open, onClose, form, setForm, majors, onSave, isEditing }: {
  open: boolean; onClose: () => void;
  form: { name: string; code: string; major_id: string };
  setForm: (f: any) => void;
  majors: MajorOption[];
  onSave: () => void; isEditing: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Mapel' : 'Tambah Mata Pelajaran'}>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Mapel</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: Matematika" /></div>
        <div className="space-y-2"><Label>Kode Mapel</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="contoh: MTK" /></div>
        <div className="space-y-2"><Label>Jurusan (opsional)</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.major_id} onChange={(e) => setForm({ ...form, major_id: e.target.value })}>
            <option value="">Umum (semua jurusan)</option>{majors.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    </Modal>
  );
}

const emptyClassForm = { name: '', major_id: '', academic_year_id: '', grade_level: 10 };
const emptySubjectForm = { name: '', code: '', major_id: '' };

function getYearColumns(isAdmin: boolean, setEditing: any, setOpen: any, deleteMutation: any): ColumnDef<any>[] {
  return [
    { accessorKey: 'name', header: 'Nama', enableSorting: true },
    { accessorKey: 'is_active', header: 'Status', enableSorting: true, cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'success' : 'warning'}>{row.original.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
    )},
    ...(isAdmin ? [{
      id: 'actions' as const,
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    }] : []),
  ];
}

function getMajorColumns(isAdmin: boolean, setEditing: any, setOpen: any, deleteMutation: any): ColumnDef<any>[] {
  return [
    { accessorKey: 'code', header: 'Kode', enableSorting: true },
    { accessorKey: 'name', header: 'Nama', enableSorting: true },
    ...(isAdmin ? [{
      id: 'actions' as const,
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    }] : []),
  ];
}

function getClassColumns(canEdit: boolean, setEditingId: any, setForm: any, setOpen: any, deleteMutation: any): ColumnDef<any>[] {
  return [
    { accessorKey: 'name', header: 'Nama', enableSorting: true },
    { accessorKey: 'major.name', header: 'Jurusan', enableSorting: true, cell: ({ row }) => row.original.major?.name || '-' },
    { accessorKey: 'grade_level', header: 'Tingkat', enableSorting: true },
    ...(canEdit ? [{
      id: 'actions' as const,
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => {
            const c = row.original;
            setEditingId(c.id);
            setForm({ name: c.name, major_id: c.major?.id || '', academic_year_id: c.academic_year?.id || '', grade_level: c.grade_level });
            setOpen(true);
          }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    }] : []),
  ];
}

function getSubjectColumns(canEdit: boolean, setEditingId: any, setForm: any, setOpen: any, deleteMutation: any): ColumnDef<any>[] {
  return [
    { accessorKey: 'code', header: 'Kode', enableSorting: true },
    { accessorKey: 'name', header: 'Nama', enableSorting: true },
    { accessorKey: 'major.name', header: 'Jurusan', enableSorting: true, cell: ({ row }) => row.original.major?.name || 'Umum' },
    ...(canEdit ? [{
      id: 'actions' as const,
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => {
            const s = row.original;
            setEditingId(s.id);
            setForm({ name: s.name, code: s.code, major_id: s.major?.id || '' });
            setOpen(true);
          }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    }] : []),
  ];
}

function AcademicPageContent() {
  const { user } = useRoleGuard([UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER]);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isOperator = user?.role === UserRole.OPERATOR;
  const canEditAcademic = isAdmin || isOperator;

  const queryClient = useQueryClient();
  const [yearOpen, setYearOpen] = useState(false);
  const [majorOpen, setMajorOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [editingMajor, setEditingMajor] = useState<any>(null);

  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: async () => { const { data } = await academicApi.getYears(); return data.data as YearOption[]; } });
  const { data: majors } = useQuery({ queryKey: ['majors'], queryFn: async () => { const { data } = await academicApi.getMajors(); return data.data as MajorOption[]; } });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: async () => { const { data } = await academicApi.getClasses(); return data.data as ClassOption[]; } });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: async () => { const { data } = await academicApi.getSubjects(); return data.data; } });

  const createYearMutation = useMutation({
    mutationFn: (data: { name: string; is_active: boolean }) => academicApi.createYear(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); toast.success('Tahun ajaran ditambahkan'); setYearOpen(false); },
  });
  const deleteYearMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteYear(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); toast.success('Tahun ajaran dihapus'); },
  });
  const updateYearMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; is_active: boolean }) => academicApi.updateYear(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); toast.success('Tahun ajaran diperbarui'); setYearOpen(false); setEditingYear(null); },
  });
  const createMajorMutation = useMutation({
    mutationFn: (dto: { name: string; code: string }) => academicApi.createMajor(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['majors'] }); toast.success('Jurusan ditambahkan'); setMajorOpen(false); },
  });
  const deleteMajorMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteMajor(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['majors'] }); toast.success('Jurusan dihapus'); },
  });
  const updateMajorMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; code: string }) => academicApi.updateMajor(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['majors'] }); toast.success('Jurusan diperbarui'); setMajorOpen(false); setEditingMajor(null); },
  });
  const saveClassMutation = useMutation({
    mutationFn: (dto: any) => editingClassId ? academicApi.updateClass(editingClassId, dto) : academicApi.createClass(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success(editingClassId ? 'Kelas diperbarui' : 'Kelas ditambahkan'); setClassOpen(false); setEditingClassId(null); setClassForm(emptyClassForm); },
  });
  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteClass(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success('Kelas dihapus'); },
  });
  const saveSubjectMutation = useMutation({
    mutationFn: (dto: any) => editingSubjectId ? academicApi.updateSubject(editingSubjectId, dto) : academicApi.createSubject(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); toast.success(editingSubjectId ? 'Mapel diperbarui' : 'Mapel ditambahkan'); setSubjectOpen(false); setEditingSubjectId(null); setSubjectForm(emptySubjectForm); },
  });
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteSubject(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Mapel dihapus'); },
  });

  const handleSaveClass = () => {
    if (!classForm.name.trim()) { toast.error('Nama kelas harus diisi'); return; }
    if (!classForm.major_id) { toast.error('Pilih jurusan'); return; }
    if (!classForm.academic_year_id) { toast.error('Pilih tahun ajaran'); return; }
    saveClassMutation.mutate(classForm);
  };
  const handleSaveSubject = () => {
    if (!subjectForm.name.trim()) { toast.error('Nama mapel harus diisi'); return; }
    if (!subjectForm.code.trim()) { toast.error('Kode mapel harus diisi'); return; }
    const dto: any = { name: subjectForm.name, code: subjectForm.code };
    if (subjectForm.major_id) dto.major_id = subjectForm.major_id;
    saveSubjectMutation.mutate(dto);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Data Akademik</h1><p className="text-muted-foreground">Kelola tahun ajaran, jurusan, kelas, dan mata pelajaran</p></div>

      <Tabs defaultValue="years" className="w-full">
        <TabsList>
          <TabsTrigger value="years"><School className="mr-2 h-4 w-4" />Tahun Ajaran</TabsTrigger>
          <TabsTrigger value="majors"><School className="mr-2 h-4 w-4" />Jurusan</TabsTrigger>
          <TabsTrigger value="classes"><Users className="mr-2 h-4 w-4" />Kelas</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="mr-2 h-4 w-4" />Mata Pelajaran</TabsTrigger>
        </TabsList>

        <TabsContent value="years" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tahun Ajaran</CardTitle>
              {isAdmin && <Button size="sm" onClick={() => setYearOpen(true)}><Plus className="mr-2 h-4 w-4" />Tambah</Button>}
            </CardHeader>
            <CardContent>
              {years && <DataTable columns={getYearColumns(isAdmin, setEditingYear, setYearOpen, deleteYearMutation)} data={years} emptyMessage="Belum ada tahun ajaran" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="majors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Jurusan</CardTitle>
              {isAdmin && <Button size="sm" onClick={() => setMajorOpen(true)}><Plus className="mr-2 h-4 w-4" />Tambah</Button>}
            </CardHeader>
            <CardContent>
              {majors && <DataTable columns={getMajorColumns(isAdmin, setEditingMajor, setMajorOpen, deleteMajorMutation)} data={majors} emptyMessage="Belum ada jurusan" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kelas</CardTitle>
              {canEditAcademic && <Button size="sm" onClick={() => { setEditingClassId(null); setClassForm(emptyClassForm); setClassOpen(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Kelas</Button>}
            </CardHeader>
            <CardContent>
              {classes && <DataTable columns={getClassColumns(canEditAcademic, setEditingClassId, setClassForm, setClassOpen, deleteClassMutation)} data={classes} emptyMessage="Belum ada kelas" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mata Pelajaran</CardTitle>
              {canEditAcademic && <Button size="sm" onClick={() => { setEditingSubjectId(null); setSubjectForm(emptySubjectForm); setSubjectOpen(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Mapel</Button>}
            </CardHeader>
            <CardContent>
              {subjects && <DataTable columns={getSubjectColumns(canEditAcademic, setEditingSubjectId, setSubjectForm, setSubjectOpen, deleteSubjectMutation)} data={subjects} emptyMessage="Belum ada mata pelajaran" />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <YearDialog open={yearOpen} onClose={() => { setYearOpen(false); setEditingYear(null); }} onSave={(name, isActive) => {
        if (editingYear) updateYearMutation.mutate({ id: editingYear.id, name, is_active: isActive });
        else createYearMutation.mutate({ name, is_active: isActive });
      }} isEditing={!!editingYear} initialName={editingYear?.name} initialActive={editingYear?.is_active} />
      <MajorDialog open={majorOpen} onClose={() => { setMajorOpen(false); setEditingMajor(null); }} onSave={(name, code) => {
        if (editingMajor) updateMajorMutation.mutate({ id: editingMajor.id, name, code });
        else createMajorMutation.mutate({ name, code });
      }} isEditing={!!editingMajor} initialName={editingMajor?.name} initialCode={editingMajor?.code} />
      <ClassDialog open={classOpen} onClose={() => { setClassOpen(false); setEditingClassId(null); }} form={classForm} setForm={setClassForm} majors={majors || []} years={years || []} onSave={handleSaveClass} isEditing={!!editingClassId} />
      <SubjectDialog open={subjectOpen} onClose={() => { setSubjectOpen(false); setEditingSubjectId(null); }} form={subjectForm} setForm={setSubjectForm} majors={majors || []} onSave={handleSaveSubject} isEditing={!!editingSubjectId} />
    </div>
  );
}

export default function AcademicPage() {
  return <ErrorBoundary><AcademicPageContent /></ErrorBoundary>;
}
