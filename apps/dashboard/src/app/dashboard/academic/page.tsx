'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Plus, Trash2, School, BookOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AcademicPage() {
  const queryClient = useQueryClient();

  // ── Academic Years ──────────────────────────────────────────
  const { data: years, isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data } = await api.get('/academic/years');
      return data.data;
    },
  });

  const createYearMutation = useMutation({
    mutationFn: (body: { name: string; is_active: boolean }) => api.post('/academic/years', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      toast.success('Tahun ajaran berhasil ditambahkan');
    },
  });

  // ── Majors ───────────────────────────────────────────────────
  const { data: majors } = useQuery({
    queryKey: ['majors'],
    queryFn: async () => {
      const { data } = await api.get('/academic/majors');
      return data.data;
    },
  });

  // ── Classes ──────────────────────────────────────────────────
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await api.get('/academic/classes');
      return data.data;
    },
  });

  // ── Subjects ─────────────────────────────────────────────────
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/academic/subjects');
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Akademik</h1>
        <p className="text-muted-foreground">Kelola tahun ajaran, jurusan, kelas, dan mata pelajaran</p>
      </div>

      <Tabs defaultValue="years" className="w-full">
        <TabsList>
          <TabsTrigger value="years">
            <School className="mr-2 h-4 w-4" /> Tahun Ajaran
          </TabsTrigger>
          <TabsTrigger value="majors">
            <School className="mr-2 h-4 w-4" /> Jurusan
          </TabsTrigger>
          <TabsTrigger value="classes">
            <Users className="mr-2 h-4 w-4" /> Kelas
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="mr-2 h-4 w-4" /> Mata Pelajaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="years" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tahun Ajaran</CardTitle>
              <Button size="sm" onClick={() => {
                const name = prompt('Nama tahun ajaran (contoh: 2024/2025):');
                if (name) createYearMutation.mutate({ name, is_active: false });
              }}>
                <Plus className="mr-2 h-4 w-4" /> Tambah
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years?.map((year: any) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.name}</TableCell>
                      <TableCell>
                        <Badge variant={year.is_active ? 'success' : 'warning'}>
                          {year.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!years || years.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Belum ada tahun ajaran
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="majors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Jurusan</CardTitle>
              <Button size="sm" onClick={() => {
                const name = prompt('Nama jurusan:');
                const code = prompt('Kode jurusan:');
                if (name && code) {
                  api.post('/academic/majors', { name, code }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['majors'] });
                    toast.success('Jurusan berhasil ditambahkan');
                  });
                }
              }}>
                <Plus className="mr-2 h-4 w-4" /> Tambah
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {majors?.map((major: any) => (
                    <TableRow key={major.id}>
                      <TableCell className="font-medium">{major.code}</TableCell>
                      <TableCell>{major.name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!majors || majors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Belum ada jurusan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes?.map((cls: any) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.major?.name || '-'}</TableCell>
                      <TableCell>{cls.grade_level}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!classes || classes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Belum ada kelas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mata Pelajaran</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects?.map((subject: any) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.code}</TableCell>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>{subject.major?.name || 'Umum'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!subjects || subjects.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Belum ada mata pelajaran
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
