# SOP Versioning & Release Guidelines (Secure CBT - Orivastra)

Dokumen ini adalah **Standar Operasional Prosedur (SOP) Baku** untuk manajemen versi dan rilis platform Secure CBT oleh **Orivastra**. Setiap kali ada penambahan fitur, perbaikan bug, atau pembuatan build APK/Dashboard baru, pengembang maupun agen AI **WAJIB** mengikuti panduan ini.

---

## 1. Aturan Semantic Versioning (SemVer)

Secure CBT menggunakan format penomoran internasional **`MAJOR.MINOR.PATCH`** (contoh: `1.1.0`):

| Elemen | Kapan Dinaikkan? | Contoh Perubahan |
|---|---|---|
| **MAJOR** (`X.0.0`) | Perombakan arsitektur besar, perubahan skema database yang memecah kompatibilitas (*breaking changes*), atau perubahan generasi produk. | Upgrade arsitektur monorepo, migrasi framework mayor. |
| **MINOR** (`1.X.0`) | Penambahan fitur baru yang signifikan namun tetap kompatibel dengan versi sebelumnya (*backward-compatible*). | Penambahan Question Studio, format soal ANBK (Isian Singkat & Menjodohkan), anti-cheat status bar baru, dsb. |
| **PATCH** (`1.1.X`) | Perbaikan bug (*hotfix*), peningkatan keamanan kecil, optimasi performa, atau penyesuaian teks/UI minor. | Perbaikan race condition token refresh, perbaikan teks label, penyesuaian styling. |

---

## 2. Aturan Khusus Android Mobile (`pubspec.yaml`)

Format versi pada Flutter diatur dalam `pubspec.yaml`:
```yaml
version: MAJOR.MINOR.PATCH+BUILD_NUMBER
# Contoh: version: 1.1.0+6
```

### ⚠️ Hukum Wajib `BUILD_NUMBER` (+N):
1. **Nilai Integer `+N` (`versionCode`) HARUS SELALU NAIK** setiap kali membuat file APK baru untuk didistribusikan.
2. Jika build number tidak dinaikkan, Android OS pada perangkat siswa akan menolak proses instalasi pembaruan (*`INSTALL_FAILED_VERSION_DOWNGRADE`* atau *`App not installed as package appears to be invalid`*).
3. Jangan pernah menurunkan atau menduplikasi build number yang sudah pernah dirilis ke perangkat fisik.

---

## 3. Brand Identity Orivastra

Setiap antarmuka publik (Login Dashboard, Footer Dashboard, Login Mobile, dan Profil Siswa) memuat identitas resmi brand:

* **Brand Name:** `Orivastra`
* **Motto / Tagline:** `"From Origin to the Stars."`
* **Attribution:** `Built with care by Orivastra`
* **Copyright:** `© 2026 Orivastra. All rights reserved.`
* **Website:** `https://orivastra.id` (atau portal terkait seperti `https://e-voting.orivastra.id/`)

---

## 4. Checklist Prosedur Rilis Baru (Release Checklist)

Sebelum melakukan `git commit`, `push`, atau `flutter build apk`, lakukan 5 langkah berikut:

1. [ ] **Perbarui Manifest Mobile (`apps/mobile/pubspec.yaml`)**:
   - Naikkan versi dan build number, misal: `version: 1.1.0+6`.
2. [ ] **Perbarui Konstanta Mobile (`apps/mobile/lib/core/constants/app_info.dart`)**:
   - Sesuaikan `AppInfo.version` dan `AppInfo.buildNumber`.
3. [ ] **Perbarui Manifest Dashboard (`apps/dashboard/package.json`)**:
   - Sesuaikan `"version": "1.1.0"`.
4. [ ] **Perbarui Konstanta Dashboard (`apps/dashboard/src/lib/constants/app-info.ts`)**:
   - Sesuaikan `APP_INFO.version`.
5. [ ] **Dokumentasikan Perubahan di `PROGRESS.md`**:
   - Tambahkan changelog pada ringkasan fase rilis terkait.
