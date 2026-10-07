# Deploy T!indak

T!indak di-deploy sebagai **satu service dengan satu alamat**. Server Express menyajikan frontend hasil build, API (`/api`), realtime (`/socket.io`), dan foto (`/api/uploads`) dari domain yang sama, sehingga cookie login tetap first-party dan tidak perlu pengaturan CORS.

## Kenapa Railway

Aplikasi ini butuh:

1. Proses Node.js yang **selalu menyala** untuk Socket.IO dan job terjadwal.
2. Database **MySQL**.
3. **Penyimpanan permanen** untuk foto laporan.

| Pilihan                 | Proses selalu menyala    | MySQL          | Penyimpanan permanen  | Catatan                                                       |
| ----------------------- | ------------------------ | -------------- | --------------------- | ------------------------------------------------------------- |
| **Railway** (dipilih)   | Ya                       | Ya (plugin)    | Ya (Volume)           | Paling sedikit langkah. Ada kredit trial, lalu paket berbayar |
| Vercel                  | Tidak (serverless)       | Tidak          | Tidak                 | Socket.IO, cron, dan upload tidak bisa jalan                  |
| Render gratis           | Tidur saat tidak dipakai | Tidak          | Tidak di paket gratis | Foto hilang setiap deploy, realtime putus                     |
| VPS (misalnya 1 GB RAM) | Ya                       | Pasang sendiri | Ya                    | Murah, tapi harus mengurus server, HTTPS, dan backup sendiri  |

**Biaya Railway:** akun baru mendapat kredit trial. Setelah habis, perlu paket Hobby (sekitar $5 per bulan, termasuk pemakaian $5). Cek harga terbaru di railway.com/pricing sebelum mendaftar.

## Persiapan

1. Akun GitHub dengan repo `oscarkuanta/tindak`, kode final sudah di branch `main`.
2. Akun Railway (daftar dengan GitHub).
3. Akun Cloudflare (gratis) untuk Turnstile.
4. Opsional: Google Cloud Console untuk login Google.

## Langkah di Railway

1. **New Project → Deploy from GitHub repo →** pilih `tindak`, branch `main`. Railway membaca `railway.json` di root repo:
   - build: `npm run build` (setelah `npm install`, yang otomatis menjalankan `prisma generate`)
   - sebelum deploy: `npm run db:deploy` (`prisma migrate deploy`)
   - start: `npm start`
   - health check: `/api/health`
2. **New → Database → MySQL.** Railway membuat service MySQL.
3. Di service aplikasi: **Settings → Volumes → New Volume**, mount path **`/data`**.
4. **Settings → Networking → Generate Domain.** Catat alamatnya, misalnya `https://tindak-production.up.railway.app`. Alamat ini dipakai sebagai `CLIENT_URL`.
5. Isi **Variables** di service aplikasi (tabel di bawah), lalu **Deploy**.

### Variables production

| Variable                  | Isi                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `NODE_ENV`                | `production`                                                                       |
| `DATABASE_URL`            | `${{MySQL.MYSQL_URL}}` (referensi ke service MySQL, lewat jaringan privat Railway) |
| `CLIENT_URL`              | Alamat dari langkah 4, wajib `https://`                                            |
| `SESSION_SECRET`          | String acak minimal 32 karakter                                                    |
| `IP_HASH_SECRET`          | String acak minimal 16 karakter                                                    |
| `UPLOAD_DIR`              | `/data/uploads`                                                                    |
| `TURNSTILE_SECRET_KEY`    | Secret key Turnstile production                                                    |
| `VITE_TURNSTILE_SITE_KEY` | Site key Turnstile production (dipakai saat build frontend)                        |
| `ADMIN_EMAILS`            | Email akun Admin, dipisah koma (opsional)                                          |
| `BOARD_ADMIN_EMAILS`      | Email akun Admin Board, dipisah koma (opsional)                                    |
| `GOOGLE_CLIENT_ID`        | Opsional, isi keduanya atau kosongkan keduanya                                     |
| `GOOGLE_CLIENT_SECRET`    | Opsional                                                                           |
| `NSFW_ENABLED`            | `true`                                                                             |
| `JOBS_ENABLED`            | `true`                                                                             |

Membuat string acak di komputer sendiri:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Server **menolak menyala** di production jika `SESSION_SECRET` atau `IP_HASH_SECRET` masih nilai contoh, `CLIENT_URL` bukan https, `UPLOAD_DIR` kosong, atau `TURNSTILE_SECRET_KEY` kosong atau kunci uji. Pesan errornya terlihat di **Deploy Logs**.

`trust proxy` otomatis aktif di production, jadi cookie `Secure`, rate limit per IP, dan `X-Forwarded-Proto` dari proxy Railway terbaca benar.

### Cloudflare Turnstile

1. Cloudflare Dashboard → **Turnstile → Add widget**.
2. Domain: domain Railway dari langkah 4 (tanpa `https://`).
3. Mode: **Managed**.
4. Salin **Site Key** ke `VITE_TURNSTILE_SITE_KEY` dan **Secret Key** ke `TURNSTILE_SECRET_KEY`. Deploy ulang setelah mengubah site key, karena frontend harus di-build ulang.

### Login Google (opsional)

1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID** (Web application).
2. **Authorized JavaScript origins:** alamat Railway, misalnya `https://tindak-production.up.railway.app`.
3. **Authorized redirect URIs:** alamat yang sama ditambah `/api/auth/google/callback`.
4. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`. `GOOGLE_CALLBACK_URL` tidak perlu diisi karena otomatis dari `CLIENT_URL`.

## Mengisi data demo di production

Seed demo harus dijalankan **di dalam service** agar foto tersimpan di volume `/data/uploads`:

1. Pasang Railway CLI dan login: `npm i -g @railway/cli`, lalu `railway login`.
2. Di folder repo: `railway link` dan pilih project serta service aplikasi.
3. `railway ssh` untuk masuk ke container yang berjalan.
4. Di dalam container: `npm run db:seed:demo`.

Migrasi sudah otomatis lewat `preDeployCommand`. Untuk menjalankan manual: `npm run db:deploy` dari dalam container.

## Memeriksa hasil deploy

Dari komputer sendiri, setelah data demo terisi:

```bash
npm run smoke -- https://tindak-production.up.railway.app
```

Script ini hanya membaca data. Ia login dengan akun demo tiap role dan memeriksa health, header keamanan, frontend tersaji, feed, pencarian, Lacak, notifikasi, antrean, statistik, Panel Admin, antrean kandidat Admin Board, hak akses, dan akun ter-ban. Hasil yang diharapkan: `13/13 cek lolos`.

Lalu cek manual di browser: buka situs, login, buka dua tab, dan pastikan perubahan status muncul tanpa refresh (Socket.IO).

## Alternatif VPS

Ubuntu 22.04 atau lebih baru dengan Node.js 22+, MySQL 8 atau MariaDB 10.6+, dan Nginx:

1. `git clone`, `npm ci`, isi `.env` dengan variabel di atas (`UPLOAD_DIR` misalnya `/var/lib/tindak/uploads`).
2. `npm run build`, `npm run db:deploy`, `npm run db:seed:demo`.
3. Jalankan `npm start` dengan pengelola proses (systemd atau pm2).
4. Nginx sebagai reverse proxy ke port 3000, termasuk upgrade WebSocket untuk `/socket.io` (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`), serta header `X-Forwarded-Proto`.
5. HTTPS dengan Certbot (Let's Encrypt).

## Batasan yang perlu diketahui

- Socket.IO berjalan di satu instance. Jika suatu saat aplikasi dijalankan lebih dari satu instance, perlu adapter Redis.
- Backup database dan volume foto perlu diatur sendiri (Railway menyediakan backup volume di paket berbayar).
- `npm audit` melaporkan kerentanan di dependensi turunan Prisma (`mariadb`, `mysql2`, `deepmerge-ts`) dan TensorFlow (`sprintf-js`). Rinciannya ada di laporan Fase 11A. Koneksi database lewat jaringan privat Railway mengurangi risiko yang terkait sambungan database.
