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
                text: 'MASTER TEMPLATE SOAL UJIAN (MICROSOFT WORD)',
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
                            text: '📌 PETUNJUK PENULISAN SOAL (FORMAT NASKAH ALAMI):',
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
                            text: '• Nomor Soal: Awali dengan [SOAL 1], [SOAL 2], atau nomor standar (1., 2.).',
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
                            text: '• Teks Pertanyaan: Tuliskan pertanyaan tepat di bawah nomor soal. Gambar/diagram dapat langsung di-paste di sini.',
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
                            text: '• Pilihan Opsi: Tuliskan opsi A s.d. E diawali huruf kapital (contoh: A. Pilihan satu).',
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
                            text: '• Kunci Jawaban: Tuliskan baris KUNCI: [A/B/C/D/E] di bawah opsi jawaban.',
                            bold: true,
                            size: 18,
                            font: 'Arial',
                            color: '1E3A8A',
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 0 },
                        children: [
                          new TextRun({
                            text: '• Metadata Opsional: Tambahkan PEMBAHASAN: [teks] dan KESULITAN: [MUDAH/SEDANG/SULIT] (default: SEDANG).',
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

          // Question 1
          new Paragraph({
            spacing: { before: 100, after: 80 },
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
                text: 'Perangkat lunak berikut ini yang berfungsi sebagai sistem operasi pada komputer adalah...',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. Microsoft Word', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. Microsoft Windows', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'C. Google Chrome', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'D. Adobe Photoshop', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'E. Visual Studio Code', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'B', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Microsoft Windows merupakan sistem operasi yang mengelola sumber daya perangkat keras dan perangkat lunak.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'MUDAH', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // Question 2
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
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Jika diketahui persamaan kuadrat 2x² + 5x - 3 = 0, maka nilai diskriminan (D) dari persamaan tersebut adalah...',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. 1', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. 49', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'C. 25', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'D. 36', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'E. -1', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'B', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Rumus diskriminan D = b² - 4ac. Nilai D = (5)² - 4(2)(-3) = 25 + 24 = 49.',
                size: 19,
                font: 'Arial',
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: 'KESULITAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: 'SEDANG', size: 19, font: 'Arial', color: '475569' }),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: '────────────────────────────────────────────────────────',
                color: 'CBD5E1',
              }),
            ],
          }),

          // Question 3
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
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Organel sel yang berfungsi sebagai tempat respirasi seluler dan penghasil energi utama (ATP) adalah...',
                size: 21,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'A. Ribosom', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'B. Mitokondria', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'C. Retikulum Endoplasma', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: 'D. Lisosom', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'E. Badan Golgi', size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'KUNCI: ', bold: true, size: 20, font: 'Arial', color: '15803D' }),
              new TextRun({ text: 'B', bold: true, size: 20, font: 'Arial', color: '15803D' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'PEMBAHASAN: ', bold: true, size: 19, font: 'Arial', color: '475569' }),
              new TextRun({
                text: 'Mitokondria merupakan penghasil energi terbesar di dalam sel melalui respirasi aerobik.',
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
              new TextRun({ text: 'SEDANG', size: 19, font: 'Arial', color: '475569' }),
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
    { width: 45 },
    { width: 35 },
  ];

  // Header Title
  guideSheet.mergeCells('B2:D2');
  const guideTitleCell = guideSheet.getCell('B2');
  guideTitleCell.value = 'ASSESSIA BY ORIVASTRA - PETUNJUK TEMPLATE EXCEL';
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
    ['', 'Soal', 'Teks lengkap pertanyaan ujian', 'Ibu kota negara Indonesia adalah...'],
    ['', 'Opsi A s.d. E', 'Pilihan jawaban A sampai E', 'Jakarta (pada kolom Opsi A)'],
    [
      '',
      'Kunci Jawaban',
      'PILIH DARI DROPDOWN MENU (A, B, C, D, atau E)',
      'A (Tersedia menu pilihan otomatis)',
    ],
    ['', 'Pembahasan (Opsional)', 'Penjelasan rinci untuk evaluasi siswa', 'Jakarta merupakan pusat pemerintahan.'],
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
    row.height = 28;

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
  guideSheet.mergeCells('B12:D13');
  const tipCell = guideSheet.getCell('B12');
  tipCell.value = '💡 TIPS: Buka lembar "✍️ Input Soal" di tab bawah untuk mulai mengisi soal. Gunakan menu dropdown pada kolom Kunci Jawaban agar terhindar dari salah ketik.';
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
    { header: 'Soal', key: 'soal', width: 45 },
    { header: 'Opsi A', key: 'opsi_a', width: 25 },
    { header: 'Opsi B', key: 'opsi_b', width: 25 },
    { header: 'Opsi C', key: 'opsi_c', width: 25 },
    { header: 'Opsi D', key: 'opsi_d', width: 25 },
    { header: 'Opsi E', key: 'opsi_e', width: 25 },
    { header: 'Kunci Jawaban', key: 'kunci', width: 16 },
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

  // Pre-seed 50 rows with data validation & default styling
  for (let r = 2; r <= 60; r++) {
    const row = inputSheet.getRow(r);
    row.height = 24;

    // Number column
    const noCell = inputSheet.getCell(`A${r}`);
    noCell.value = r - 1;
    noCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Column H (Kunci): Dropdown A, B, C, D, E
    const keyCell = inputSheet.getCell(`H${r}`);
    keyCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"A,B,C,D,E"'],
      showErrorMessage: true,
      errorTitle: 'Pilihan Tidak Valid',
      error: 'Kunci jawaban harus berupa salah satu huruf: A, B, C, D, atau E',
    };
    keyCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Column J (Kesulitan): Dropdown MUDAH, SEDANG, SULIT
    const diffCell = inputSheet.getCell(`J${r}`);
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
    ['B', 'C', 'D', 'E', 'F', 'G', 'I'].forEach((col) => {
      const c = inputSheet.getCell(`${col}${r}`);
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  }

  // Pre-seed 2 sample questions in Input Soal so teachers immediately have working examples
  inputSheet.getRow(2).values = [
    1,
    'Perangkat lunak berikut ini yang berfungsi sebagai sistem operasi pada komputer adalah...',
    'Microsoft Word',
    'Microsoft Windows',
    'Google Chrome',
    'Adobe Photoshop',
    'Visual Studio Code',
    'B',
    'Microsoft Windows merupakan sistem operasi yang mengelola perangkat lunak dan keras.',
    'MUDAH',
  ];
  inputSheet.getRow(3).values = [
    2,
    'Jika diketahui persamaan kuadrat 2x² + 5x - 3 = 0, maka nilai diskriminan (D) adalah...',
    '1',
    '49',
    '25',
    '36',
    '-1',
    'B',
    'Rumus diskriminan D = b² - 4ac. Nilai D = (5)² - 4(2)(-3) = 25 + 24 = 49.',
    'SEDANG',
  ];

  // ─────────────────────────────────────────────────────────
  // SHEET 3: Contoh Soal
  // ─────────────────────────────────────────────────────────
  const exampleSheet = workbook.addWorksheet('💡 Contoh Soal', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    properties: { tabColor: { argb: 'F59E0B' } },
  });

  exampleSheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Soal', key: 'soal', width: 45 },
    { header: 'Opsi A', key: 'opsi_a', width: 25 },
    { header: 'Opsi B', key: 'opsi_b', width: 25 },
    { header: 'Opsi C', key: 'opsi_c', width: 25 },
    { header: 'Opsi D', key: 'opsi_d', width: 25 },
    { header: 'Opsi E', key: 'opsi_e', width: 25 },
    { header: 'Kunci Jawaban', key: 'kunci', width: 16 },
    { header: 'Pembahasan (Opsional)', key: 'pembahasan', width: 35 },
    { header: 'Tingkat Kesulitan', key: 'kesulitan', width: 18 },
  ];

  const exHeader = exampleSheet.getRow(1);
  exHeader.height = 32;
  exHeader.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const sampleQuestions = [
    [
      1,
      'Perangkat lunak berikut ini yang berfungsi sebagai sistem operasi pada komputer adalah...',
      'Microsoft Word',
      'Microsoft Windows',
      'Google Chrome',
      'Adobe Photoshop',
      'Visual Studio Code',
      'B',
      'Microsoft Windows merupakan sistem operasi yang mengelola perangkat komputer.',
      'MUDAH',
    ],
    [
      2,
      'Jika diketahui persamaan kuadrat 2x² + 5x - 3 = 0, maka nilai diskriminan (D) adalah...',
      '1',
      '49',
      '25',
      '36',
      '-1',
      'B',
      'Rumus D = b² - 4ac = (5)² - 4(2)(-3) = 25 + 24 = 49.',
      'SEDANG',
    ],
    [
      3,
      'Organel sel yang berfungsi sebagai tempat respirasi seluler dan penghasil energi utama (ATP) adalah...',
      'Ribosom',
      'Mitokondria',
      'Retikulum Endoplasma',
      'Lisosom',
      'Badan Golgi',
      'B',
      'Mitokondria merupakan the powerhouse of the cell penghasil ATP.',
      'SEDANG',
    ],
  ];

  sampleQuestions.forEach((q, idx) => {
    const row = exampleSheet.getRow(idx + 2);
    row.values = q;
    row.height = 30;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    exampleSheet.getCell(`A${idx + 2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    exampleSheet.getCell(`H${idx + 2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    exampleSheet.getCell(`J${idx + 2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
