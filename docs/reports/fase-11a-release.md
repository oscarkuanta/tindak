# Laporan Fase 11A: Data Demo, QA, Deploy (Backend)

- Branch: `chore/f11-release`
- Pemilik: Oscar (bagian A, backend; bagian B dikerjakan anggota tim lain)
- Tanggal: 2026-10-07
- PR: dicatat di commit berikutnya

## Ringkasan

Fase ini menyiapkan rilis dari sisi backend: data demo lengkap untuk semua role dan alur verifikasi Board, tes alur kritis dan keamanan, pemeriksaan performa, validasi env production, konfigurasi Railway (satu service, satu domain, volume permanen untuk foto), script cek situs, serta dokumen DEMO, DEPLOY, QA-CHECKLIST, DEMO-SCRIPT, dan README final. Server mode production dengan data demo lolos 13/13 cek `npm run smoke`.

## Yang Dikerjakan

- `npm run db:seed:demo` (`server/prisma/seed-demo.js`):
  - 45 akun untuk semua role, password `demo1234`;
  - 8 Board di Surabaya dan Sidoarjo dengan 6 jenis berbeda, campuran Pihak Resmi dan Relawan;
  - 81 laporan selama sekitar 60 hari, mencakup semua status dan tingkat bahaya, termasuk yang terlambat, dibuka ulang, duplikat, dan ditolak dengan alasan;
  - dukungan, reaksi, rating, pengikut, notifikasi, antrean moderasi, dan 1 ban.
- Data alur verifikasi: 2 Official dengan riwayat, 2 kandidat yang memenuhi semua syarat, 1 Board Komunitas berskor tinggi tetapi rating kurang dari 20, 1 Board yang Official-nya pernah dicabut dengan alasan, dan pasangan nama mirip (Jalan Ahmad Yani Surabaya dengan label Terpercaya, Jl. A. Yani Surabaya dengan label Perlu Waspada).
- Seed demo menolak berjalan di database yang sudah berisi data, kecuali dengan `--reset`. Data acaknya deterministik.
- Foto demo: 10 ilustrasi dibuat sendiri dengan `server/scripts/generate-demo-photos.js` (sharp + SVG) di `server/prisma/demo-photos/`, lisensi CC0.
- Tes baru:
  - `flows.test.js`: 3 alur kritis ujung ke ujung;
  - `security.test.js`: memeriksa seluruh route tulis, menolak tamu dengan 401, privasi pelapor anonim dan tamu, header keamanan, cookie, CSRF;
  - `performance.test.js`: feed tanpa N+1, index lewat EXPLAIN;
  - tes env production.
- Validasi env production: menolak secret yang masih nilai contoh, `CLIENT_URL` tanpa https, dan `UPLOAD_DIR` kosong.
- `npm run smoke`: cek cepat situs yang berjalan (hanya membaca data) untuk dipakai setelah deploy.
- `railway.json`: build, `prisma migrate deploy` sebelum deploy, start, dan health check.
- Dokumen baru: `docs/DEMO.md`, `docs/DEPLOY.md`, `docs/QA-CHECKLIST.md`, `docs/DEMO-SCRIPT.md` (sekitar 6 menit, batas video 7 menit). README diperbarui (fitur, arsitektur, tempat screenshot, link demo, data demo, deploy).
- PROGRESS: 10A Selesai dengan #27. Baris 11 dipecah menjadi 11A dan 11B.

## File Penting

| File                                                                            | Keterangan                               |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| `server/prisma/seed-demo.js`                                                    | Data demo                                |
| `server/prisma/demo-photos/*.jpg`                                               | Ilustrasi foto demo (CC0)                |
| `server/scripts/generate-demo-photos.js`                                        | Pembuat ilustrasi                        |
| `server/scripts/smoke.js`                                                       | Cek cepat situs dengan akun demo         |
| `server/src/config/env.js`                                                      | Aturan env production                    |
| `server/src/utils/slugify.js`                                                   | Perbaikan slug (kota tidak diulang)      |
| `server/src/routes.js`                                                          | `apiMounts()` untuk tes keamanan route   |
| `server/tests/flows.test.js`                                                    | Alur kritis                              |
| `server/tests/security.test.js`                                                 | Hak akses, privasi, header, cookie, CSRF |
| `server/tests/performance.test.js`                                              | N+1 dan index                            |
| `railway.json`                                                                  | Konfigurasi Railway                      |
| `docs/DEMO.md`, `docs/DEPLOY.md`, `docs/QA-CHECKLIST.md`, `docs/DEMO-SCRIPT.md` | Dokumen rilis                            |

## Perubahan Database

Tidak ada migrasi baru. Pemeriksaan index menunjukkan query feed (`is_hidden, hot_score`), feed Board (`board_id, is_hidden, priority_score`), antrean (`board_id, status`), pencarian (`city, type`), dan notifikasi (`user_id, read_at`) sudah memakai index.

## Endpoint Baru

Tidak ada. Perubahan perilaku: slug Board baru tidak mengulang nama kota jika nama sudah diakhiri kota (dicatat di `docs/API.md`).

## Cara Menguji Manual

1. Buat database kosong untuk demo (atau pakai database lokal yang boleh dikosongkan), arahkan `DATABASE_URL` ke sana, lalu jalankan `npm run db:deploy` dan `npm run db:seed:demo`.
2. `npm run dev`, login dengan akun di `docs/DEMO.md`, dan ikuti `docs/DEMO-SCRIPT.md`.
3. `npm run smoke -- http://localhost:3000`: hasilnya harus 13/13.
4. Mode production lokal: `npm run build`, lalu jalankan server dengan `NODE_ENV=production`, `CLIENT_URL` https, `UPLOAD_DIR`, dan `TURNSTILE_SECRET_KEY` non-uji. Buka `http://localhost:3000`: frontend tersaji dari server yang sama.

## Hasil Tes

- `npm run lint`: lolos (status keluar 0). Catatan: `docs/design/ui-reference.html` (bukan buatan fase ini, belum masuk git) sempat gagal cek Prettier, lalu ikut terformat oleh `prettier --write docs`. Isinya tidak berubah, hanya spasi dan indentasi, dan file itu tidak ikut di-commit.
- `npm test`: server 408 tes lolos (23 file), client 80 tes lolos (22 file).
- `npm run smoke` terhadap server mode production lokal dengan data demo: 13/13 lolos.

## Keputusan dan Alasan

- **Railway** dipilih karena menyediakan proses yang selalu menyala, MySQL, dan volume permanen dalam satu project. Vercel tidak cocok untuk Socket.IO, cron, dan upload. Perbandingan dan biaya ada di `docs/DEPLOY.md`.
- **Satu service, satu domain.** Server menyajikan frontend sehingga cookie tetap first-party. `trust proxy` aktif di production agar cookie Secure dan rate limit per IP bekerja di belakang proxy.
- **"Pihak Resmi dan Relawan"** tidak didefinisikan di dokumen, jadi diwujudkan lewat jabatan pengelola (misalnya Wakasek Sarpras, Ketua RW) dibanding relawan atau tanpa jabatan.
- **Foto demo** digambar sendiri dengan script supaya tidak ada risiko lisensi dan tidak perlu mengunduh dari internet.
- **Seed demo dijalankan di dalam service** (`railway ssh`) agar foto tersimpan di volume, bukan di komputer yang menjalankan perintah.
- **Tes keamanan memakai `apiMounts()`**, sehingga setiap route baru otomatis ikut diperiksa. Endpoint tulis publik dibatasi ke 5 yang memang untuk tamu.

## Bug yang Ditemukan dan Diperbaiki

- **Slug Board mengulang nama kota.** Contoh: "SMAN 5 Surabaya" di Kota Surabaya menjadi `sman-5-surabaya-surabaya`. Sekarang menjadi `sman-5-surabaya`, dengan unit test baru. Board lama tidak berubah karena slug memang tidak pernah berubah. `seed.js` development sekarang mencari Board berdasarkan nama dan kota, agar seed ulang di database lama tidak membuat Board ganda.
- **`server/tests/stats.test.js` (Fase 10A) berisi karakter BOM tak terlihat di sebuah regex**, sehingga ESLint gagal. Kemungkinan besar CI PR #27 merah karena ini. Penyebabnya, saat Fase 10A saya hanya membaca baris terakhir output lint, bukan status keluarnya. Sudah diganti dengan escape `\uFEFF`, dan pemeriksaan lint sekarang memakai status keluar.
- **Font Poppins dan Montserrat diblokir CSP di production** (ditemukan setelah redesign Fase 12). Frontend memuat font dari Google Fonts, sedangkan CSP hanya mengizinkan stylesheet dari situs sendiri. Di mode dev tidak terlihat karena CSP hanya aktif saat server menyajikan frontend. Diperbaiki di branch `fix/f11-csp-fonts`: `style-src` mengizinkan `https://fonts.googleapis.com` dan `font-src` mengizinkan `https://fonts.gstatic.com`. Tes baru di `security.test.js` membaca semua alamat luar di `client/index.html`, `client/src/index.css`, dan widget Turnstile, lalu memastikan semuanya ada di CSP.

## npm audit

| Paket                         | Lewat                       | Tingkat  | Keputusan                                                                                                                                                                                                  |
| ----------------------------- | --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mariadb` 3.4.5               | `@prisma/adapter-mariadb`   | High     | Celah membocorkan password ke penyerang di jaringan (MitM). Di Railway koneksi lewat jaringan privat. Override ke 3.5 dicoba, tetapi merusak instalasi, jadi dibatalkan. Tunggu Prisma memperbarui adapter |
| `mysql2` 3.15.3               | Prisma CLI                  | High     | Hanya dipakai CLI migrasi, risiko sama (MitM). Perbaikan otomatis menurunkan Prisma ke versi 6, tidak dilakukan                                                                                            |
| `deepmerge-ts` 7              | `@prisma/config`            | High     | Hanya memproses konfigurasi Prisma, bukan input pengguna                                                                                                                                                   |
| `sprintf-js` lewat `argparse` | `@tensorflow/tfjs` (nsfwjs) | Moderate | Hanya parser argumen CLI TensorFlow, tidak tersentuh input pengguna                                                                                                                                        |

## Hal yang Belum Selesai

- **Deploy sungguhan ke Railway** dan pengisian data demo di production butuh akun dan kredensial milik tim (Railway, Cloudflare Turnstile, opsional Google OAuth). Langkahnya ada di `docs/DEPLOY.md`. Setelah live, link demo diisi di README dan hasil `npm run smoke` dicatat.
- **Kolom Tampilan di QA-CHECKLIST, screenshot README, dan halaman dashboard (10B)** dikerjakan bagian B.
- **PR `dev` ke `main`** dibuat setelah 10B dan 11B masuk dan situs live.
- **File `docs/design/ui-reference.html`** belum masuk git. Pemiliknya perlu memutuskan apakah file ini masuk repo; formatnya sekarang sudah sesuai Prettier.

## Catatan untuk Fase 11B (frontend)

- Isi kolom **Tampilan** di `docs/QA-CHECKLIST.md` dengan data demo dan akun di `docs/DEMO.md`.
- Ambil 6 screenshot ke `docs/screenshots/` dengan nama sesuai README: `beranda.png`, `board.png`, `kanban.png`, `verifikasi.png`, `admin.png`, `statistik.png`.
- Latih `docs/DEMO-SCRIPT.md` di browser. Jika ada langkah yang berbeda dengan tampilan, sesuaikan naskahnya.
