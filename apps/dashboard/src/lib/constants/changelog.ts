export type ChangeCategory = 'feature' | 'improvement' | 'security' | 'fix';

export interface ChangelogItem {
  category: ChangeCategory;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  releaseDate: string;
  title: string;
  isLatest?: boolean;
  versionGroup: 'v1.7' | 'v1.6' | 'v1.5' | 'v1.0-v1.4';
  changes: ChangelogItem[];
}

export const CHANGELOG_STORAGE_KEY = 'cbt_last_seen_changelog_version';

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.7.4',
    releaseDate: '18 Oktober 2026',
    title: 'Manajemen Kredensial Siswa, Port Kartu Cetak & Cron Auto-Submit',
    isLatest: true,
    versionGroup: 'v1.7',
    changes: [
      {
        category: 'feature',
        text: 'Portal cetak kartu ujian siswa siap potong dalam format PDF multi-template & ekspor Excel kredensial.',
      },
      {
        category: 'feature',
        text: 'Generator password massal per-kelas dan penyimpanan kata sandi terenkripsi aman untuk kemudahan distribusi kartu peserta.',
      },
      {
        category: 'security',
        text: 'Credential scrambling saat soft-delete akun pengguna agar NIS/email/username dapat didaftarkan kembali tanpa konflik data.',
      },
      {
        category: 'feature',
        text: 'Cron job otomatis setiap menit di server backend untuk auto-submit sesi ujian yang waktu atau durasinya telah habis.',
      },
      {
        category: 'improvement',
        text: 'Pengaturan show_results pada ujian untuk menyembunyikan skor dan pembahasan kunci jawaban bagi siswa saat dinonaktifkan.',
      },
    ],
  },
  {
    version: 'v1.7.3',
    releaseDate: '16 Oktober 2026',
    title: 'Sinkronisasi Sesi Ujian, Exit Deterrence & Realtime Bell',
    versionGroup: 'v1.7',
    changes: [
      {
        category: 'security',
        text: 'Exit deterrence dan answer merge: jawaban dan sisa durasi ujian tersinkronisasi otomatis saat aplikasi ditutup mendadak.',
      },
      {
        category: 'feature',
        text: 'Koneksi realtime WebSocket namespace /monitoring ke dashboard Notification Bell untuk peringatan langsung.',
      },
      {
        category: 'improvement',
        text: 'Input alamat IP/URL server dinamis pada aplikasi mobile siswa dengan dialog uji koneksi server lokal.',
      },
      {
        category: 'improvement',
        text: 'Pra-caching offline stimulus gambar dan audio di aplikasi mobile untuk kelancaran pengerjaan saat jaringan lambat.',
      },
    ],
  },
  {
    version: 'v1.7.2',
    releaseDate: '14 Oktober 2026',
    title: 'Pesan Siaran Pengawas Bertarget & Telemetri Kustom',
    versionGroup: 'v1.7',
    changes: [
      {
        category: 'feature',
        text: 'Pesan siaran bertarget dari pengawas ujian (pesan pribadi ke satu siswa atau siaran umum ke seluruh ruang).',
      },
      {
        category: 'security',
        text: 'Pengetatan keamanan ujian di mobile: deteksi split-screen & pull-down status bar secara instan dengan toleransi waktu terkontrol.',
      },
      {
        category: 'improvement',
        text: 'Navigasi kembali ganda (double-tap back) di halaman utama mobile untuk mencegah aplikasi tertutup tidak sengaja.',
      },
    ],
  },
  {
    version: 'v1.7.1',
    releaseDate: '12 Oktober 2026',
    title: 'Audit Akses Guru (SBAC), Self-Registration, dan Audio Multi-Format',
    versionGroup: 'v1.7',
    changes: [
      {
        category: 'security',
        text: 'Subject-Based Access Control (SBAC): Guru hanya dapat mengakses bank soal, pembuatan ujian, dan telemetri untuk mapel yang ditugaskan.',
      },
      {
        category: 'feature',
        text: 'Sistem pendaftaran mandiri (self-registration) guru dengan verifikasi email otomatis dan token undangan kepala sekolah.',
      },
      {
        category: 'improvement',
        text: 'Pemutar audio stimulus listening di aplikasi mobile dengan batas putaran maksimal dan proteksi anti-rewind.',
      },
    ],
  },
  {
    version: 'v1.7.0',
    releaseDate: '8 Oktober 2026',
    title: 'Audio Stimulus Player & Native Alarm Pelanggaran',
    versionGroup: 'v1.7',
    changes: [
      {
        category: 'feature',
        text: 'Modul audio stimulus player untuk ujian listening bahasa asing di dashboard dan aplikasi mobile.',
      },
      {
        category: 'security',
        text: 'Alarm pelanggaran native dengan getaran haptik dan bunyi peringatan saat siswa terdeteksi mencoba curang.',
      },
      {
        category: 'feature',
        text: 'Panel pemantauan langsung (Live Telemetry) dengan socket WebSocket untuk deteksi status pengerjaan siswa realtime.',
      },
    ],
  },
  {
    version: 'v1.6.0',
    releaseDate: '1 Oktober 2026',
    title: 'Aksi Massal Soal, Riwayat Revisi Esai & Berita Acara Formal',
    versionGroup: 'v1.6',
    changes: [
      {
        category: 'feature',
        text: 'Ekspor Berita Acara Formal Nilai Ujian sesuai format cetak resmi sekolah (kop surat, tabel ringkasan, dan kolom tanda tangan).',
      },
      {
        category: 'feature',
        text: 'Modul penilaian esai terpadu untuk koreksi manual guru dengan catatan revisi dan audit trail riwayat penilaian.',
      },
      {
        category: 'improvement',
        text: 'Aksi massal hapus dan pindah soal antar bank soal dengan seleksi baris DataTable multi-select.',
      },
      {
        category: 'improvement',
        text: 'Ekspor nilai siswa ke format Excel bergradien rapi dengan visualisasi warna status kelulusan KKM.',
      },
    ],
  },
  {
    version: 'v1.5.0',
    releaseDate: '25 September 2026',
    title: 'Word & Excel Importer 6 Tipe Soal, Stratified Random Pool & Item Analysis',
    versionGroup: 'v1.5',
    changes: [
      {
        category: 'feature',
        text: 'Import soal dari dokumen Word (.docx) dan Excel otomatis mengenali 6 tipe soal (Pilihan Ganda, Pilihan Majemuk, Benar/Salah, Menjodohkan, Isian Singkat, dan Esai).',
      },
      {
        category: 'feature',
        text: 'Stratified Random Question Pool: Pengacakan paket soal seimbang berdasarkan topik dan tingkat kesulitan.',
      },
      {
        category: 'feature',
        text: 'Pembobotan nilai per-tingkat kesulitan soal (Mudah, Sedang, Sulit) dengan normalisasi skor otomatis.',
      },
      {
        category: 'feature',
        text: 'Item Analysis & Distractor Distribution: Analisis daya pembeda soal dan efektivitas pilihan pengecoh.',
      },
    ],
  },
  {
    version: 'v1.4.0',
    releaseDate: '18 September 2026',
    title: 'Review Soal & Penjelasan Ujian, Visual Math Keyboard KaTeX',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'feature',
        text: 'Fitur review hasil ujian dengan pembahasan soal lengkap dan penjelasan kunci jawaban pasca-ujian.',
      },
      {
        category: 'improvement',
        text: 'Keyboard virtual visual matematika LaTeX & KaTeX di Question Studio untuk memudahkan guru matematika/sains.',
      },
      {
        category: 'improvement',
        text: 'Integrasi brand identity resmi Assessia by Orivastra dengan launcher icon dan aset grafis modern.',
      },
    ],
  },
  {
    version: 'v1.3.0',
    releaseDate: '12 September 2026',
    title: 'Executive Bento Dashboard & Command Palette (Ctrl+K)',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'improvement',
        text: 'Perombakan tata letak dashboard dengan konsep Executive Bento Grid untuk navigasi data yang lebih informatif.',
      },
      {
        category: 'feature',
        text: 'Command Palette global (Ctrl+K / ⌘K) untuk navigasi kilat ke menu, pencarian siswa, atau bank soal.',
      },
      {
        category: 'security',
        text: 'Overlay peringatan pelanggaran berjenjang dengan penghitung mundur penalti psikologis.',
      },
    ],
  },
  {
    version: 'v1.2.0',
    releaseDate: '5 September 2026',
    title: 'Proteksi Anti Multi-Window & Pull-Down Status Bar',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'security',
        text: 'Deteksi dan pemblokiran otomatis saat siswa mencoba membuka split-screen atau multi-window di perangkat mobile.',
      },
      {
        category: 'security',
        text: 'Pencegahan tarikan status bar notifikasi Android untuk menutupi celah kecurangan siswa.',
      },
    ],
  },
  {
    version: 'v1.1.0',
    releaseDate: '28 Agustus 2026',
    title: 'Dukungan Formula KaTeX & Syntax Highlighting Kode',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'feature',
        text: 'Dukungan rendering formula matematika LaTeX & KaTeX serta blok kode pemrograman berpewarnaan sintaks.',
      },
      {
        category: 'improvement',
        text: 'Tipe soal baru: Menjodohkan (Matching Pairs) dan Isian Singkat (Short Answer).',
      },
    ],
  },
  {
    version: 'v1.0.1',
    releaseDate: '20 Agustus 2026',
    title: 'Token Refresh Coordinator & Idempotent Submission',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'fix',
        text: 'Token refresh coordinator single-flight di aplikasi mobile untuk mengeliminasi race condition refresh token.',
      },
      {
        category: 'fix',
        text: 'Idempotent exam submit untuk mencegah duplikasi lembar jawaban saat koneksi internet sekolah tidak stabil.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    releaseDate: '15 Agustus 2026',
    title: 'Genesis Release: Fondasi Monorepo Assessia Secure CBT',
    versionGroup: 'v1.0-v1.4',
    changes: [
      {
        category: 'feature',
        text: 'Fondasi arsitektur monorepo: NestJS + Prisma backend, Next.js dashboard, dan Flutter mobile app.',
      },
      {
        category: 'security',
        text: 'Autentikasi JWT ganda (Access Token & Refresh Token) dengan enkripsi bcrypt dan role-based access control.',
      },
      {
        category: 'feature',
        text: 'Manajemen pengguna lengkap (Admin, Operator, Guru, Siswa), Bank Soal, Pembuatan Ujian, dan Penilaian Otomatis.',
      },
    ],
  },
];
