# 📖 Panduan Lengkap Deployment Secure CBT ke VPS (Hybrid: Docker + PM2)

Panduan ini mendokumentasikan langkah demi langkah mempublikasikan **Secure CBT** (Backend NestJS + Dashboard Next.js + Database PostgreSQL + Redis + MinIO) ke VPS Linux (Ubuntu 22.04 / 24.04 atau Debian 12) dengan spesifikasi yang sangat mumpuni (**4 vCPU / 12 GB RAM**).

---

## 🏗️ Gambaran Arsitektur

```text
Siswa (Mobile App) & Guru (Browser)
                │
                ▼
       [Port 80 / 443 HTTPS]
           NGINX Reverse Proxy
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
[Port 3001]         [Port 3000]
Dashboard (Next.js)  Backend API & WebSockets (NestJS)
(Dikelola PM2)      (Dikelola PM2)
                         │ (Koneksi Internal 127.0.0.1)
                ┌────────┴────────┐
                ▼                 ▼
          [Port 5432]       [Port 6379]
          PostgreSQL 16       Redis 7
          (Docker Volume)   (Docker Volume)
```

* **Keuntungan Model Ini:**
  * **Sangat Cepat & Responsif:** Node.js berjalan native di host, memanfaatkan 4 vCPU dan RAM 12 GB tanpa overhead container ganda.
  * **Aman Terisolasi:** Database & Redis berjalan di dalam container Docker dan **hanya membuka port ke `127.0.0.1`** (kebal dari scanning/hacking publik).
  * **Zero-Downtime Updates:** Cukup jalankan `./deploy/update.sh` setiap ada rilis baru.

---

## 🌐 1. Konfigurasi DNS Domain

Sebelum login ke VPS, buka dashboard penyedia domain Anda (Cloudflare, Niagahoster, Rumahweb, dll.) dan buat **2 buah A Record** yang mengarah ke IP Publik VPS Anda:

| Type | Name / Host | Target / Value | Keterangan |
|---|---|---|---|
| **A** | `cbt` | `<IP_PUBLIK_VPS>` | Dashboard Web Guru & Admin (`cbt.domainanda.com`) |
| **A** | `api` | `<IP_PUBLIK_VPS>` | Backend API & WebSockets (`api.domainanda.com`) |

*(Opsional jika menggunakan MinIO publik: buat A Record `s3` mengarah ke IP yang sama).*

---

## 🖥️ 2. Persiapan Awal Server VPS

Login ke server VPS melalui terminal SSH:

```bash
ssh root@<IP_PUBLIK_VPS>
```

Clone repositori proyek ini ke direktori `/var/www/secure-cbt`:

```bash
mkdir -p /var/www
cd /var/www
git clone <URL_REPO_GITHUB_ANDA> secure-cbt
cd /var/www/secure-cbt
```

Jalankan script provisioning otomatis untuk menginstal Docker, Node.js 22, pnpm, PM2, Nginx, dan UFW Firewall:

```bash
chmod +x deploy/*.sh
bash deploy/setup-vps.sh
```

---

## 🔑 3. Konfigurasi File Environment (.env)

### A. Environment Database Docker (`.env` di root)
Buat file `.env` di folder root `/var/www/secure-cbt`:

```bash
cp .env.prod.infra.example .env
nano .env
```
Isi dengan password aman:
```env
DB_USER=postgres
DB_PASSWORD=BuatPasswordDatabaseKuat123!
DB_NAME=secure_cbt
REDIS_PASSWORD=BuatPasswordRedisKuat123!
MINIO_ROOT_USER=cbt_minio_admin
MINIO_ROOT_PASSWORD=BuatPasswordMinioKuat123!
```

---

### B. Environment Backend (`apps/backend/.env`)
```bash
cp apps/backend/.env.production.example apps/backend/.env
nano apps/backend/.env
```

Sesuaikan nilai-nilai berikut:
1. `APP_URL`: Ganti ke `https://api.domainanda.com`
2. `CORS_ORIGIN`: Ganti ke `https://cbt.domainanda.com,https://api.domainanda.com`
3. `DATABASE_URL`: Masukkan password yang sama dengan langkah A di atas:
   ```env
   DATABASE_URL="postgresql://postgres:BuatPasswordDatabaseKuat123!@localhost:5432/secure_cbt?schema=public"
   ```
4. `REDIS_PASSWORD` & `BULLMQ_REDIS_PASSWORD`: Samakan dengan `REDIS_PASSWORD` di atas.
5. `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`:
   Buat string acak unik dengan perintah:
   ```bash
   openssl rand -base64 32
   ```
   Lalu tempelkan ke kedua variabel tersebut.
6. `SOCKET_IO_CORS_ORIGIN`: `https://cbt.domainanda.com`

---

### C. Environment Dashboard (`apps/dashboard/.env.production`)
⚠️ *Penting: Variabel `NEXT_PUBLIC_*` dibakar langsung saat proses kompilasi Next.js (`pnpm run build`).*

```bash
cp apps/dashboard/.env.production.example apps/dashboard/.env.production
nano apps/dashboard/.env.production
```

Isi dengan domain publik Anda:
```env
NEXT_PUBLIC_API_URL=https://api.domainanda.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.domainanda.com
```

---

## 🗄️ 4. Menjalankan Database & Migrasi Prisma

Jalankan container PostgreSQL, Redis, dan MinIO:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Periksa bahwa container aktif dan sehat:
```bash
docker compose -f docker-compose.prod.yml ps
```

Install dependensi monorepo dan jalankan migrasi database:
```bash
# 1. Install seluruh package monorepo
pnpm install

# 2. Build shared package terlebih dahulu
cd packages/shared && pnpm run build && cd ../..

# 3. Generate Prisma client & migrasi tabel
cd apps/backend
npx prisma generate
npx prisma migrate deploy

# (Opsional) Jika ingin memasukkan data awal guru & siswa demo:
# npx prisma db seed

cd ../..
```

---

## 🚀 5. Build Proyek & Jalankan via PM2

Kompilasi aplikasi NestJS dan Next.js untuk produksi:

```bash
# Build backend & dashboard
pnpm run build
```

Nyalakan kedua aplikasi menggunakan PM2:

```bash
pm2 start ecosystem.config.cjs
```

Periksa status proses:
```bash
pm2 status
```
> Anda akan melihat dua service aktif:
> - `secure-cbt-backend` (port 3000) - `online`
> - `secure-cbt-dashboard` (port 3001) - `online`

Simpan konfigurasi PM2 agar otomatis hidup kembali saat VPS direboot:
```bash
pm2 save
pm2 startup
# (Jalankan perintah 'sudo env PATH=...' yang ditampilkan oleh PM2 di layar)
```

---

## 🔒 6. Konfigurasi NGINX & SSL HTTPS Gratis (Certbot)

Salin konfigurasi Nginx yang sudah disiapkan:

```bash
sudo cp deploy/nginx/secure-cbt.conf /etc/nginx/sites-available/secure-cbt
```

Buka file konfigurasi dan ganti `api.domainanda.com` dan `cbt.domainanda.com` dengan nama domain asli Anda:
```bash
sudo nano /etc/nginx/sites-available/secure-cbt
```

Aktifkan konfigurasi Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/secure-cbt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Pasang sertifikat SSL HTTPS otomatis dari Let's Encrypt:
```bash
sudo certbot --nginx -d cbt.domainanda.com -d api.domainanda.com
```
*Pilih opsi redirect HTTP to HTTPS (otomatis).*

Selesai! Sekarang buka browser Anda di:
👉 **`https://cbt.domainanda.com`** (Dashboard Admin & Guru siap digunakan!)

---

## 📱 7. Build APK Mobile untuk Siswa

Pada laptop/komputer lokal Anda, buat file APK rilis yang sudah terhubung ke domain HTTPS produksi Anda:

```powershell
cd apps/mobile
flutter build apk --release --dart-define=API_URL=https://api.domainanda.com
```

File APK siap didistribusikan:
📁 `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## 🔄 8. Cara Update Proyek di Masa Depan (One-Click)

Setiap kali Anda melakukan commit pembaruan baru di GitHub/Git, Anda cukup masuk ke VPS dan menjalankan:

```bash
cd /var/www/secure-cbt
./deploy/update.sh
```

Script ini akan secara otomatis:
1. `git pull` kode terbaru
2. Update dependensi pnpm jika ada package baru
3. Menjalankan migrasi database otomatis (`prisma migrate deploy`)
4. Build ulang TypeScript backend & Next.js dashboard
5. Reload PM2 dengan zero-downtime (`pm2 reload ecosystem.config.cjs`)

---

## 🛠️ Perintah Berguna untuk Pemeliharaan Harian

| Perintah | Fungsi |
|---|---|
| `pm2 status` | Melihat status Backend & Dashboard |
| `pm2 logs` | Melihat live log gabungan |
| `pm2 logs secure-cbt-backend` | Melihat log spesifik backend |
| `pm2 monit` | Membuka interactive GUI monitoring CPU/RAM di terminal |
| `docker compose -f docker-compose.prod.yml ps` | Memeriksa status PostgreSQL & Redis |
| `docker compose -f docker-compose.prod.yml logs -f postgres` | Melihat log PostgreSQL |
