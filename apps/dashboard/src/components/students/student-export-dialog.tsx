'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { FileSpreadsheet, Printer, CreditCard, Table as TableIcon } from 'lucide-react';
import {
  StudentCredentialsPrintTemplate,
  type ExportStudentItem,
} from './student-credentials-print-template';

interface ClassOption {
  id: string;
  name: string;
}

interface StudentExportDialogProps {
  open: boolean;
  onClose: () => void;
  students: ExportStudentItem[];
  classes: ClassOption[];
  selectedClassId?: string;
  onExportExcel: (options: { class_id?: string; student_ids?: string[] }) => Promise<void>;
  schoolName?: string;
}

export function StudentExportDialog({
  open,
  onClose,
  students,
  classes,
  selectedClassId,
  onExportExcel,
  schoolName,
}: StudentExportDialogProps) {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [pdfTemplate, setPdfTemplate] = useState<'tabular' | 'cards'>('tabular');
  const [targetScope, setTargetScope] = useState<'filtered' | 'class'>(
    selectedClassId ? 'class' : 'filtered',
  );
  const [targetClassId, setTargetClassId] = useState<string>(
    selectedClassId || classes[0]?.id || '',
  );
  const [isExporting, setIsExporting] = useState(false);

  const targetStudents = useMemo(() => {
    if (targetScope === 'class' && targetClassId) {
      return students.filter((s) => s.class?.id === targetClassId);
    }
    return students;
  }, [students, targetScope, targetClassId]);

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return;
    document.body.classList.add('printing-student-credentials');

    const handleAfterPrint = () => {
      document.body.classList.remove('printing-student-credentials');
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    window.print();

    // Fallback cleanup
    setTimeout(() => {
      document.body.classList.remove('printing-student-credentials');
    }, 2500);
  }, []);

  const handleExecuteExport = async () => {
    if (format === 'excel') {
      try {
        setIsExporting(true);
        await onExportExcel({
          class_id: targetScope === 'class' ? targetClassId : undefined,
          student_ids: targetScope === 'filtered' ? targetStudents.map((s) => s.id) : undefined,
        });
        onClose();
      } finally {
        setIsExporting(false);
      }
    } else {
      handlePrint();
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Ekspor Kredensial Siswa"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Batal
            </Button>
            <Button
              data-testid="export-action-button"
              onClick={handleExecuteExport}
              disabled={isExporting || targetStudents.length === 0}
            >
              {isExporting ? (
                'Memproses...'
              ) : format === 'excel' ? (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Unduh Excel (.xlsx)
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak / Simpan PDF
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Target Data Scope */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cakupan Siswa</Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  targetScope === 'filtered' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="targetScope"
                  value="filtered"
                  checked={targetScope === 'filtered'}
                  onChange={() => setTargetScope('filtered')}
                  className="h-4 w-4 text-primary"
                />
                <div>
                  <div className="text-sm font-medium">Siswa Saat Ini</div>
                  <div className="text-xs text-muted-foreground">
                    {students.length} siswa (sesuai filter)
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  targetScope === 'class' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="targetScope"
                  value="class"
                  checked={targetScope === 'class'}
                  onChange={() => setTargetScope('class')}
                  className="h-4 w-4 text-primary"
                />
                <div>
                  <div className="text-sm font-medium">Pilih Kelas</div>
                  <div className="text-xs text-muted-foreground">Satu rombel kelas penuh</div>
                </div>
              </label>
            </div>

            {targetScope === 'class' && (
              <div className="pt-2">
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Format Dokumen</Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  format === 'excel' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  className="h-4 w-4 text-primary"
                />
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="text-sm font-medium block">Excel (.xlsx)</span>
                    <span className="text-xs text-muted-foreground block">Tabel spreadsheet</span>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  format === 'pdf' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  className="h-4 w-4 text-primary"
                />
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium block">PDF / Cetak Dokumen</span>
                    <span className="text-xs text-muted-foreground block">Siap cetak A4</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* PDF Template Options */}
          {format === 'pdf' && (
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-sm font-semibold">Desain Template PDF</Label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    pdfTemplate === 'tabular' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdfTemplate"
                    value="tabular"
                    checked={pdfTemplate === 'tabular'}
                    onChange={() => setPdfTemplate('tabular')}
                    className="h-4 w-4 text-primary mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <TableIcon className="h-4 w-4 text-primary" />
                      <span>Daftar Tabel</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tabel formal memanjang dengan kolom tanda tangan siswa.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    pdfTemplate === 'cards' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdfTemplate"
                    value="cards"
                    checked={pdfTemplate === 'cards'}
                    onChange={() => setPdfTemplate('cards')}
                    className="h-4 w-4 text-primary mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>Kartu Peserta</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kartu potong login (cut-out) bergaris putus-putus siap dibagikan.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Info Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>Jumlah siswa yang akan diekspor:</span>
            <span className="font-semibold text-foreground">{targetStudents.length} siswa</span>
          </div>
        </div>
      </Modal>

      {/* Invisible on screen, visible during window.print() */}
      <StudentCredentialsPrintTemplate
        students={targetStudents}
        templateType={pdfTemplate}
        schoolName={schoolName}
      />
    </>
  );
}
