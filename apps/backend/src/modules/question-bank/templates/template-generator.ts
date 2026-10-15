import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import ExcelJS from 'exceljs';

export async function generateWordTemplate(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Header / Brand Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'ASSESSIA BY ORIVASTRA',
                bold: true,
                size: 32, // 16pt
                color: '1E3A8A', // Deep Blue
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'MASTER TEMPLATE SOAL UJIAN MULTI-TIPE (MICROSOFT WORD)',
                bold: true,
                size: 22, // 11pt
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),

          // Instructions Box (Single cell table styled as a callout)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: {
                      fill: 'F1F5F9', // Light Slate
                      type: ShadingType.CLEAR,
                    },
                    margins: {
                      top: 160,
                      bottom: 160,
                      left: 200,
                      right: 200,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
                      left: { style: BorderStyle.SINGLE, size: 18, color: '2563EB' }, // Accent border
                      right: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
                    },
                    children: [
                      new Paragraph({
                        spacing: { after: 100 },
                        children: [
                          new TextRun({
                            text: '📌 PETUNJUK PENULISAN SOAL MULTI-TIPE (FORMAT NASKAH ALAMI):',
                            bold: true,
                            size: 20,
                            color: '1E293B',
                            font: 'Arial',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Awali setiap butir soal dengan: [SOAL 1], [SOAL 2], atau 1., 2.',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Tipe Soal (Opsional): Tuliskan tag TIPE: [PILIHAN_GANDA / PG_KOMPLEKS / BENAR_SALAH / ISIAN_SINGKAT / MENJODOHKAN / ESAI]. Parser akan otomatis mendeteksi jika tag tidak ditulis.',
                            bold: true,
                            size: 18,
                            font: 'Arial',
                            color: '2563EB',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Pilihan Ganda Biasa: Opsi A s.d. E, baris KUNCI: [A/B/C/D/E].',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• PG Kompleks: Opsi A s.d. E, baris KUNCI: A, B, D (kunci dipisahkan koma).',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Benar / Salah: Baris KUNCI: BENAR atau KUNCI: SALAH (opsi tidak perlu ditulis manual).',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Isian Singkat: Baris KUNCI: [kata kunci jawaban] (opsi tidak perlu ditulis).',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Menjodohkan: Tuliskan pasangan opsi dengan tanda panah: A. Pernyataan -> Pasangan (atau tanda panah →).',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: '• Esai / Uraian: Tuliskan pertanyaan dan pembahasan, tanpa opsi dan kunci jawaban.',
                            size: 18,
                            font: 'Arial',
                            color: '334155',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 0 },
                        children: [
                          new TextRun({
                            text: '• Metadata: Tambahkan PEMBAHASAN: [teks] dan KESULITAN: [MUDAH/SEDANG/SULIT] (default: SEDANG). Gambar diagram dapat langsung di-paste.',
                            size: 18,
                            font: 'Arial',
                            color: '64748B',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 300 } }),

          // ─────────────────────────────────────────────────────────
          // SOAL 1: Pilihan Ganda (MULTIPLE_CHOICE)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 1]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Ibu kota negara Indonesia saat ini berlokasi di Provinsi Kalimantan Timur dengan nama...',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. Jakarta', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. Surabaya', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'C. Nusantara', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'D. Medan', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'E. Makassar', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'C', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Ibu Kota Nusantara (IKN) berlokasi di wilayah Kabupaten Penajam Paser Utara dan Kutai Kartanegara, Kalimantan Timur.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'MUDAH', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // ─────────────────────────────────────────────────────────
          // SOAL 2: PG Kompleks (MULTI_SELECT)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 2]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TIPE: PG_KOMPLEKS',
                bold: true,
                size: 19,
                color: '7C3AED',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Manakah dari bahasa pemrograman berikut ini yang umumnya dieksekusi menggunakan interpreter (diinterpretasi)?',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. Python', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. JavaScript', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'C. C++', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'D. Ruby', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'A, B, D', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Python, JavaScript, dan Ruby dieksekusi oleh interpreter runtime, sedangkan C++ dikompilasi ke machine code.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'SEDANG', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // ─────────────────────────────────────────────────────────
          // SOAL 3: Benar / Salah (TRUE_FALSE)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 3]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TIPE: BENAR_SALAH',
                bold: true,
                size: 19,
                color: 'D97706',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Fotosintesis pada tumbuhan hijau menghasilkan gas oksigen dan senyawa glukosa.',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'BENAR', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Reaksi fotosintesis: 6CO2 + 6H2O + cahaya -> C6H12O6 + 6O2.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'MUDAH', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // ─────────────────────────────────────────────────────────
          // SOAL 4: Isian Singkat (SHORT_ANSWER)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 4]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TIPE: ISIAN_SINGKAT',
                bold: true,
                size: 19,
                color: '0891B2',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Bahasa resmi yang digunakan oleh penduduk negara Brazil adalah...',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'Portugis, portugis, Portuguese', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Brazil dijajah oleh Portugal sehingga bahasa resminya adalah bahasa Portugis.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'SEDANG', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // ─────────────────────────────────────────────────────────
          // SOAL 5: Menjodohkan (MATCHING)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 5]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TIPE: MENJODOHKAN',
                bold: true,
                size: 19,
                color: '4F46E5',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Jodohkanlah nama pahlawan nasional berikut dengan kota asalnya:',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. R.A. Kartini -> Jepara', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. Pangeran Diponegoro -> Yogyakarta', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'C. Cut Nyak Dien -> Aceh', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Kartini berasal dari Jepara, Diponegoro berjuang di Yogyakarta, dan Cut Nyak Dien dari Aceh.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'SULIT', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // ─────────────────────────────────────────────────────────
          // SOAL 6: Esai / Uraian (ESSAY)
          // ─────────────────────────────────────────────────────────
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '[SOAL 6]',
                bold: true,
                size: 22,
                color: '2563EB',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TIPE: ESAI',
                bold: true,
                size: 19,
                color: 'E11D48',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Jelaskan perbedaan mendasar antara siklus lisogenik dan siklus litik pada proses replikasi virus!',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Siklus litik menghancurkan/melisiskan sel inang segera setelah proses perakitan virus baru, sedangkan siklus lisogenik menyisipkan materi genetik virus ke dalam genom sel inang tanpa langsung mematikan sel.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'SULIT', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Assessia by Orivastra';
  workbook.lastModifiedBy = 'Assessia';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ─────────────────────────────────────────────────────────
  // SHEET 1: Panduan
  // ─────────────────────────────────────────────────────────
  const guideSheet = workbook.addWorksheet('📋 Panduan', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: '2563EB' } },
  });

  guideSheet.columns = [
    { width: 4 },
    { width: 22 },
    { width: 48 },
    { width: 38 },
  ];

  // Header Title
  guideSheet.mergeCells('B2:D2');
  const guideTitleCell = guideSheet.getCell('B2');
  guideTitleCell.value = 'ASSESSIA BY ORIVASTRA - PETUNJUK TEMPLATE EXCEL MULTI-TIPE';
  guideTitleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  guideTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' },
  };
  guideTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  guideSheet.getRow(2).height = 35;

  const guideRows = [
    ['', 'Nama Kolom', 'Keterangan & Format', 'Contoh Pengisian'],
    ['', 'No', 'Nomor urut butir soal', '1, 2, 3...'],
    [
      '',
      'Tipe Soal',
      'PILIH DARI DROPDOWN MENU (PILIHAN GANDA, PG KOMPLEKS, BENAR SALAH, ISIAN SINGKAT, MENJODOHKAN, ESAI)',
      'PILIHAN GANDA (Tersedia menu dropdown)',
    ],
    ['', 'Soal', 'Teks lengkap pertanyaan ujian', 'Ibu kota negara Indonesia adalah...'],
    [
      '',
      'Opsi A s.d. E',
      'Pilihan jawaban A sampai E. Untuk Menjodohkan gunakan format tanda panah: Pernyataan -> Pasangan (atau →). Kosongkan untuk Benar/Salah, Isian, dan Esai.',
      'Jakarta (Opsi A) atau Kartini -> Jepara',
    ],
    [
      '',
      'Kunci Jawaban',
      'PG: A-E | PG Kompleks: A, B, D | Benar Salah: BENAR / SALAH | Isian: Kata kunci | Menjodohkan & Esai: Kosongkan',
      'B (PG) atau A, B, D (Kompleks)',
    ],
    ['', 'Pembahasan (Opsional)', 'Penjelasan rinci untuk evaluasi dan rubrik siswa', 'Nusantara di Kalimantan Timur.'],
    [
      '',
      'Tingkat Kesulitan',
      'PILIH DARI DROPDOWN (MUDAH, SEDANG, SULIT)',
      'SEDANG (Default jika dikosongkan)',
    ],
  ];

  guideRows.forEach((r, idx) => {
    const rowIdx = idx + 4;
    const row = guideSheet.getRow(rowIdx);
    row.values = r;
    row.height = 30;

    if (idx === 0) {
      // Header table
      ['B', 'C', 'D'].forEach((col) => {
        const c = guideSheet.getCell(`${col}${rowIdx}`);
        c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
        c.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    } else {
      ['B', 'C', 'D'].forEach((col) => {
        const c = guideSheet.getCell(`${col}${rowIdx}`);
        c.font = { name: 'Arial', size: 10, color: { argb: '1E293B' } };
        c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        c.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      });
    }
  });

  // Tip Card
  guideSheet.mergeCells('B13:D14');
  const tipCell = guideSheet.getCell('B13');
  tipCell.value = '💡 TIPS: Buka lembar "✍️ Input Soal" di tab bawah untuk mulai mengisi soal baru. Contoh penulisan lengkap untuk seluruh 6 tipe soal (Pilihan Ganda, PG Kompleks, Benar/Salah, Isian Singkat, Menjodohkan, Esai) dapat dilihat di lembar "💡 Contoh Soal Multi-Tipe".';
  tipCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '1E3A8A' } };
  tipCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
  tipCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // ─────────────────────────────────────────────────────────
  // SHEET 2: Input Soal (Formulir Utama / Blank Data Entry)
  // ─────────────────────────────────────────────────────────
  const inputSheet = workbook.addWorksheet('✍️ Input Soal', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    properties: { tabColor: { argb: '10B981' } },
  });

  const questionColumns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tipe Soal', key: 'tipe_soal', width: 20 },
    { header: 'Soal', key: 'soal', width: 48 },
    { header: 'Opsi A', key: 'opsi_a', width: 26 },
    { header: 'Opsi B', key: 'opsi_b', width: 26 },
    { header: 'Opsi C', key: 'opsi_c', width: 26 },
    { header: 'Opsi D', key: 'opsi_d', width: 26 },
    { header: 'Opsi E', key: 'opsi_e', width: 26 },
    { header: 'Kunci Jawaban', key: 'kunci', width: 22 },
    { header: 'Pembahasan (Opsional)', key: 'pembahasan', width: 35 },
    { header: 'Tingkat Kesulitan', key: 'kesulitan', width: 18 },
  ];

  inputSheet.columns = questionColumns;

  // Header styling for Sheet 2
  const inputHeaderRow = inputSheet.getRow(1);
  inputHeaderRow.height = 32;
  inputHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: 'thin', color: { argb: '334155' } },
    };
  });

  // Pre-seed 50 clean blank rows with data validation & default styling
  const cellBorderThin = {
    top: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
  };

  for (let r = 2; r <= 51; r++) {
    const row = inputSheet.getRow(r);
    row.height = 24;

    // Number column
    const noCell = inputSheet.getCell(`A${r}`);
    noCell.value = r - 1;
    noCell.font = { name: 'Arial', size: 10, color: { argb: '64748B' } };
    noCell.alignment = { vertical: 'middle', horizontal: 'center' };
    noCell.border = cellBorderThin;

    // Column B (Tipe Soal): Dropdown list
    const typeCell = inputSheet.getCell(`B${r}`);
    typeCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PILIHAN GANDA,PG KOMPLEKS,BENAR SALAH,ISIAN SINGKAT,MENJODOHKAN,ESAI"'],
      showErrorMessage: true,
      errorTitle: 'Tipe Soal Tidak Valid',
      error: 'Pilihlah salah satu tipe soal yang tersedia dari menu dropdown',
    };
    typeCell.font = { name: 'Arial', size: 10 };
    typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
    typeCell.border = cellBorderThin;

    // Column C to J
    ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
      const c = inputSheet.getCell(`${col}${r}`);
      c.font = { name: 'Arial', size: 10 };
      c.alignment = {
        vertical: 'middle',
        horizontal: col === 'I' ? 'center' : 'left',
        wrapText: true,
      };
      c.border = cellBorderThin;
    });

    // Column K (Kesulitan): Dropdown MUDAH, SEDANG, SULIT
    const diffCell = inputSheet.getCell(`K${r}`);
    diffCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"MUDAH,SEDANG,SULIT"'],
      showErrorMessage: true,
      errorTitle: 'Kesulitan Tidak Valid',
      error: 'Tingkat kesulitan harus berupa: MUDAH, SEDANG, atau SULIT',
    };
    diffCell.font = { name: 'Arial', size: 10 };
    diffCell.alignment = { vertical: 'middle', horizontal: 'center' };
    diffCell.border = cellBorderThin;
  }

  // ─────────────────────────────────────────────────────────
  // SHEET 3: Contoh Soal Multi-Tipe (Contoh Nyata 6 Tipe)
  // ─────────────────────────────────────────────────────────
  const exampleSheet = workbook.addWorksheet('💡 Contoh Soal Multi-Tipe', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    properties: { tabColor: { argb: '8B5CF6' } },
  });

  exampleSheet.columns = questionColumns;

  // Header styling for Sheet 3
  const exampleHeaderRow = exampleSheet.getRow(1);
  exampleHeaderRow.height = 32;
  exampleHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } }; // Indigo dark
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: '1E1B4B' } },
      bottom: { style: 'medium', color: { argb: '1E1B4B' } },
      left: { style: 'thin', color: { argb: '4338CA' } },
      right: { style: 'thin', color: { argb: '4338CA' } },
    };
  });

  // Ready-made examples for all 6 question types
  const sampleQuestions = [
    [
      1,
      'PILIHAN GANDA',
      'Perangkat lunak berikut ini yang berfungsi sebagai sistem operasi pada komputer adalah...',
      'Microsoft Word',
      'Linux Ubuntu',
      'Adobe Photoshop',
      'Google Chrome',
      'VLC Media Player',
      'B',
      'Linux Ubuntu merupakan sistem operasi komputer open-source berbasis kernel Linux.',
      'MUDAH',
    ],
    [
      2,
      'PG KOMPLEKS',
      'Manakah dari bahasa pemrograman berikut ini yang umumnya dieksekusi menggunakan interpreter (diinterpretasi)?',
      'Python',
      'JavaScript',
      'C++',
      'Ruby',
      '',
      'A, B, D',
      'Python, JavaScript, dan Ruby dieksekusi oleh interpreter runtime, sedangkan C++ dikompilasi ke machine code.',
      'SEDANG',
    ],
    [
      3,
      'BENAR SALAH',
      'Fotosintesis pada tumbuhan hijau menghasilkan gas oksigen dan senyawa glukosa.',
      '',
      '',
      '',
      '',
      '',
      'BENAR',
      'Reaksi fotosintesis: 6CO2 + 6H2O + cahaya -> C6H12O6 + 6O2.',
      'MUDAH',
    ],
    [
      4,
      'ISIAN SINGKAT',
      'Bahasa resmi yang digunakan oleh penduduk negara Brazil adalah...',
      '',
      '',
      '',
      '',
      '',
      'Portugis, portugis',
      'Brazil merupakan satu-satunya negara berbahasa resmi Portugis di benua Amerika Selatan.',
      'SEDANG',
    ],
    [
      5,
      'MENJODOHKAN',
      'Jodohkanlah nama pahlawan nasional berikut dengan kota asalnya:',
      'R.A. Kartini -> Jepara',
      'Pangeran Diponegoro -> Yogyakarta',
      'Cut Nyak Dien -> Aceh',
      '',
      '',
      '',
      'Kartini berasal dari Jepara, Diponegoro berjuang di Yogyakarta, dan Cut Nyak Dien dari Aceh.',
      'SULIT',
    ],
    [
      6,
      'ESAI',
      'Jelaskan perbedaan mendasar antara siklus lisogenik dan litik pada proses replikasi virus!',
      '',
      '',
      '',
      '',
      '',
      '',
      'Siklus litik menghancurkan/melisiskan sel inang segera setelah replikasi virus baru, sedangkan siklus lisogenik menyisipkan materi genetik virus ke kromosom sel inang tanpa langsung mematikan sel.',
      'SULIT',
    ],
  ];

  sampleQuestions.forEach((rowValues, idx) => {
    const rowNum = idx + 2;
    const row = exampleSheet.getRow(rowNum);
    row.values = rowValues;
    row.height = 36;

    const isEven = idx % 2 === 1;
    const bgArgb = isEven ? 'F8FAFC' : 'FFFFFF';

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 10, color: { argb: '1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = cellBorderThin;

      // Alignments
      if (c === 1 || c === 2 || c === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (c === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (cell.value) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '15803D' } };
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    }

    // Add validation to example sheet as well
    const typeCell = exampleSheet.getCell(`B${rowNum}`);
    typeCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PILIHAN GANDA,PG KOMPLEKS,BENAR SALAH,ISIAN SINGKAT,MENJODOHKAN,ESAI"'],
    };

    const diffCell = exampleSheet.getCell(`K${rowNum}`);
    diffCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"MUDAH,SEDANG,SULIT"'],
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
