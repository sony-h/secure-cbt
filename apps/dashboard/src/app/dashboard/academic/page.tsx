'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, School, BookOpen, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YearDialog } from '@/components/academic/year-dialog';
import { MajorDialog } from '@/components/academic/major-dialog';
import { ClassDialog } from '@/components/academic/class-dialog';
import { SubjectDialog } from '@/components/academic/subject-dialog';

interface MajorOption { id: string; name: string; code: string; }
interface YearOption { id: string; name: string; is_active: boolean; }
interface ClassOption { id: string; name: string; major?: { name: string }; grade_level: number; }

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Hapus Tahun Ajaran</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus tahun ajaran ini?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Hapus Jurusan</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus jurusan ini?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Hapus Kelas</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus kelas ini?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus mata pelajaran ini?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
  const [editingYear, setEditingYear] = useState<YearOption | null>(null);
  const [editingMajor, setEditingMajor] = useState<MajorOption | null>(null);

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
