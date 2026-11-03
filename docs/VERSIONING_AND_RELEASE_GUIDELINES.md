# SOP Versioning & Release Guidelines (Assessia by Orivastra)

Dokumen ini adalah **Standar Operasional Prosedur (SOP) Baku** untuk manajemen versi dan rilis platform **Assessia** oleh **Orivastra**. Setiap kali ada penambahan fitur, perbaikan bug, atau pembuatan build APK/Dashboard baru, pengembang maupun agen AI **WAJIB** mengikuti panduan ini.

---

## 1. Single Source of Truth (SSOT) Arsitektur Versi

Seluruh penomoran versi di monorepo Secure CBT (Assessia) diatur secara terpusat melalui berkas kanonikal:
📁 **`version.json`** (di root direktori proyek):
```json
{
  "version": "1.9.0",
  "buildNumber": 21,
  "releaseDate": "2026-11-01"
}
```

Script otomatis **`scripts/sync-version.mjs`** menjamin seluruh manifest dan berkas kode tersinkronisasi 100% tanpa inkonsistensi manual:
1. Root `package.json`
2. `packages/shared/package.json`
3. `apps/backend/package.json`
4. `apps/dashboard/package.json`
5. `apps/mobile/pubspec.yaml`
6. `apps/mobile/lib/core/constants/app_info.dart`
7. `packages/shared/src/constants/version.ts` (dikonsumsi langsung oleh dashboard via `@secure-cbt/shared`)

---

## 2. Perintah Tunggal Manajemen Versi (CLI Commands)

Gunakan perintah pnpm di root repository untuk mengubah versi:

### A. Menaikkan Versi (Version Bump)
Perintah ini otomatis menaikkan SemVer, meng-increment Android `buildNumber` (+1), memperbarui `version.json`, dan menyinkronkan seluruh 7 target manifest secara instan:
```bash
# Patch bump (contoh: 1.9.0 -> 1.9.1, build: 21 -> 22)
pnpm version:bump patch

# Minor bump (contoh: 1.9.0 -> 1.10.0, build: 21 -> 22)
pnpm version:bump minor

# Major bump (contoh: 1.9.0 -> 2.0.0, build: 21 -> 22)
pnpm version:bump major

# Explicit target version (dengan auto-increment buildNumber)
pnpm version:bump 1.9.5

# Explicit target version & explicit buildNumber
pnpm version:bump 1.9.5 25
```

### B. Memeriksa Sinkronisasi (Verification Check)
Verifikasi apakah ada berkas yang versinya tertinggal atau tidak sesuai dengan `version.json`:
```bash
pnpm version:check
```
*Jika ada ketidakcocokan, perintah akan mengembalikan exit code 1 dan menampilkan daftar berkas yang out-of-sync.*

### C. Sinkronisasi Manual Ulang
Jika ada berkas yang ter-reset atau baru ditambahkan:
```bash
pnpm version:sync
```

---

## 3. Aturan Semantic Versioning (SemVer)

Secure CBT menggunakan format penomoran internasional **`MAJOR.MINOR.PATCH`** (contoh: `1.9.0`):

| Elemen | Kapan Dinaikkan? | Contoh Perubahan |
|---|---|---|
| **MAJOR** (`X.0.0`) | Perombakan arsitektur besar, perubahan skema database yang memecah kompatibilitas (*breaking changes*), atau perubahan generasi produk. | Upgrade arsitektur monorepo, migrasi framework mayor. |
| **MINOR** (`1.X.0`) | Penambahan fitur baru yang signifikan namun tetap kompatibel dengan versi sebelumnya (*backward-compatible*). | Penambahan Question Studio, format soal ANBK, multi-attempt, anti-leak solution lock, dsb. |
| **PATCH** (`1.1.X`) | Perbaikan bug (*hotfix*), peningkatan keamanan kecil, optimasi performa, atau penyesuaian teks/UI minor. | Perbaikan race condition token refresh, perbaikan teks label, penyesuaian styling. |

---

## 4. Aturan Khusus Android Mobile (`pubspec.yaml`)

Format versi pada Flutter diatur dalam `pubspec.yaml`:
```yaml
version: MAJOR.MINOR.PATCH+BUILD_NUMBER
# Contoh: version: 1.9.0+21
```

### ⚠️ Hukum Wajib `BUILD_NUMBER` (+N):
1. **Nilai Integer `+N` (`versionCode`) HARUS SELALU NAIK** setiap kali membuat file APK baru untuk didistribusikan.
2. Jika build number tidak dinaikkan, Android OS pada perangkat siswa akan menolak proses instalasi pembaruan (*`INSTALL_FAILED_VERSION_DOWNGRADE`* atau *`App not installed as package appears to be invalid`*).
3. Jangan pernah menurunkan atau menduplikasi build number yang sudah pernah dirilis ke perangkat fisik.
4. Perintah `pnpm version:bump` sudah otomatis meng-increment integer ini setiap kali dieksekusi.

---

## 5. Brand Identity Orivastra & Assessia

Setiap antarmuka publik (Login Dashboard, Footer Dashboard, Login Mobile, dan Profil Siswa) memuat identitas resmi brand:

* **Product Name:** `Assessia`
* **Product Slogan:** `"Measure Learning. Empower Progress."`
* **Parent Brand:** `Orivastra`
* **Parent Slogan:** `"From Origin to the Stars."`
* **Attribution:** `Built with care by Orivastra`
* **Copyright:** `© 2026 Orivastra. All rights reserved.`
* **Website:** `https://orivastra.id`

---

## 6. Prosedur Wajib Rilis Baru (Mandatory Release Checklist)

Sebelum melakukan `git commit`, `git tag`, atau `flutter build apk`, jalankan urutan langkah berikut:

- [ ] **Langkah 1: Jalankan Version Bump**
  ```bash
  pnpm version:bump <patch|minor|major|versi>
  ```
- [ ] **Langkah 2: Tambahkan Catatan Rilis Dashboard**
  - Buka `apps/dashboard/src/lib/constants/changelog.ts`.
  - Tambahkan objek `ChangelogEntry` baru di awal array dengan `isLatest: true`, tanggal rilis, ringkasan fitur, perbaikan, dan peningkatan keamanan.
  - Hapus flag `isLatest: true` dari versi sebelumnya.
- [ ] **Langkah 3: Dokumentasikan di `PROGRESS.md`**
  - Perbarui nomor versi dan tanggal update di bagian header `PROGRESS.md`.
  - Tambahkan ringkasan fase rilis baru di bagian akhir dokumen.
- [ ] **Langkah 4: Jalankan Verifikasi Otomatis**
  ```bash
  pnpm version:check
  pnpm test
  cd apps/mobile && flutter test
  ```
- [ ] **Langkah 5: Commit & Git Tag**
  ```bash
  git add .
  git commit -m "chore(release): vX.Y.Z+N release notes and version bump"
  git tag -a vX.Y.Z -m "Release vX.Y.Z (Build N)"
  git push origin master --tags
  ```
