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
                            text: '• Menjodohkan: Tuliskan pasangan opsi dengan tanda panah: A. Pernyataan -> Pasangan.',
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
      'Pilihan jawaban A sampai E. Untuk Menjodohkan gunakan format: Pernyataan -> Pasangan. Kosongkan untuk Benar/Salah, Isian, dan Esai.',
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
  tipCell.value = '💡 TIPS: Buka lembar "✍️ Input Soal" di tab bawah untuk mulai mengisi soal. Kolom Tipe Soal memudahkan Assessia mengenali format soal secara otomatis tanpa resiko salah tafsir.';
  tipCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '1E3A8A' } };
  tipCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
  tipCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // ─────────────────────────────────────────────────────────
  // SHEET 2: Input Soal (Formulir Utama)
  // ─────────────────────────────────────────────────────────
  const inputSheet = workbook.addWorksheet('✍️ Input Soal', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    properties: { tabColor: { argb: '10B981' } },
  });

  inputSheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tipe Soal', key: 'tipe_soal', width: 20 },
    { header: 'Soal', key: 'soal', width: 45 },
    { header: 'Opsi A', key: 'opsi_a', width: 25 },
    { header: 'Opsi B', key: 'opsi_b', width: 25 },
    { header: 'Opsi C', key: 'opsi_c', width: 25 },
    { header: 'Opsi D', key: 'opsi_d', width: 25 },
    { header: 'Opsi E', key: 'opsi_e', width: 25 },
    { header: 'Kunci Jawaban', key: 'kunci', width: 22 },
    { header: 'Pembahasan (Opsional)', key: 'pembahasan', width: 35 },
    { header: 'Tingkat Kesulitan', key: 'kesulitan', width: 18 },
  ];

  // Header styling
  const headerRow = inputSheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: '0F172A' } },
    };
  });

  // Pre-seed 60 rows with data validation & default styling
  for (let r = 2; r <= 60; r++) {
    const row = inputSheet.getRow(r);
    row.height = 24;

    // Number column
    const noCell = inputSheet.getCell(`A${r}`);
    noCell.value = r - 1;
    noCell.alignment = { vertical: 'middle', horizontal: 'center' };

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
    typeCell.alignment = { vertical: 'middle', horizontal: 'center' };

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
    diffCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Set wrapping for text cells
    ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
      const c = inputSheet.getCell(`${col}${r}`);
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  }

  // Pre-seed sample rows with all 6 question types
  inputSheet.getRow(2).values = [
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
  ];

  inputSheet.getRow(3).values = [
    2,
    'PG KOMPLEKS',
    'Manakah dari bahasa pemrograman berikut yang dieksekusi secara interpreted?',
    'Python',
    'JavaScript',
    'C++',
    'Ruby',
    '',
    'A, B, D',
    'Python, JavaScript, dan Ruby diinterpretasi oleh runtime engine.',
    'SEDANG',
  ];

  inputSheet.getRow(4).values = [
    3,
    'BENAR SALAH',
    'Fotosintesis pada tumbuhan hijau menghasilkan oksigen dan senyawa glukosa.',
    '',
    '',
    '',
    '',
    '',
    'BENAR',
    'Reaksi fotosintesis menghasilkan C6H12O6 dan gas O2.',
    'MUDAH',
  ];

  inputSheet.getRow(5).values = [
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
  ];

  inputSheet.getRow(6).values = [
    5,
    'MENJODOHKAN',
    'Jodohkanlah nama pahlawan nasional berikut dengan kota asalnya:',
    'R.A. Kartini -> Jepara',
    'Pangeran Diponegoro -> Yogyakarta',
    'Cut Nyak Dien -> Aceh',
    '',
    '',
    '',
    'Kartini berasal dari Jepara, Diponegoro dari Yogyakarta, Cut Nyak Dien dari Aceh.',
    'SULIT',
  ];

  inputSheet.getRow(7).values = [
    6,
    'ESAI',
    'Jelaskan perbedaan mendasar antara siklus lisogenik dan litik pada replikasi virus!',
    '',
    '',
    '',
    '',
    '',
    '',
    'Siklus litik melisiskan sel inang segera setelah replikasi, sedangkan siklus lisogenik menyisipkan materi genetik virus ke kromosom sel inang.',
    'SULIT',
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
