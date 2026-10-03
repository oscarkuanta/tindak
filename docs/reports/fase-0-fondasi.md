# Laporan Fase 0: Fondasi

- Branch: `chore/f0-fondasi`
- Pemilik: Oscar
- Tanggal: 2026-10-03
- PR: ke `main` (khusus Fase 0)

## Ringkasan

Repo disiapkan agar 3 anggota tim dan AI masing-masing bisa bekerja paralel tanpa bentrok. Monorepo npm workspaces (`client`, `server`, `shared`) sudah berjalan: server Express 5 + Prisma 7 terhubung ke MySQL, client React + Vite memakai proxy `/api`, ada format respons dan error standar, tes, lint, CI, dan dokumen kerja tim. Belum ada fitur produk.

## Yang Dikerjakan

- Istilah "Room" di `docs/PRODUCT.md` diganti menjadi "Board" (88 kata, 75 baris). Isi lain tidak diubah.
- Monorepo npm workspaces dengan script root `dev`, `build`, `lint`, `format`, `test`, dan `db:*`.
- Server: `createApp()` tanpa listen (helmet, cors, JSON 1 MB, cookie-parser, pino-http, rate limit umum, router `/api`, 404 JSON, error handler terpusat).
- `AppError`, middleware `validate(schema, sumber)`, pembuat rate limiter, validasi env dengan Zod.
- Error handler mengubah `AppError`, `ZodError`, Prisma `P2002` dan `P2025`, JSON rusak, dan body terlalu besar ke format standar. Error tak dikenal menjadi 500 tanpa stack di production.
- `GET /api/health` mengecek koneksi database.
- Prisma 7 untuk MySQL dengan driver adapter `@prisma/adapter-mariadb`, client singleton di `server/src/lib/prisma.js`.
- Client: Vite + proxy, wrapper `api.js`, TanStack Query, React Router, layout 3 kolom, Beranda kosong, halaman 404, komponen dasar UI, design token Tailwind di satu file.
- Shared: konstanta `APP_NAME`, `ERROR_CODES`, skema contoh `idParamSchema`.
- Tooling: ESLint flat config, Prettier, `.editorconfig`, `.gitattributes` (LF), docker-compose MySQL 8, GitHub Actions CI.
- Dokumen: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/API.md` (kontrak Fase 1 dan 2), `docs/PROGRESS.md`, template laporan, template PR.

## File Penting

| File                                     | Keterangan                                               |
| ---------------------------------------- | -------------------------------------------------------- |
| `server/src/app.js`                      | Membuat Express app, dipakai server dan tes              |
| `server/src/server.js`                   | Listen port dan graceful shutdown                        |
| `server/src/routes.js`                   | Router `/api`, tempat mendaftarkan modul baru            |
| `server/src/config/env.js`               | Validasi env dengan Zod                                  |
| `server/src/middlewares/errorHandler.js` | Pemetaan semua error ke format standar                   |
| `server/src/middlewares/validate.js`     | Validasi body, query, params dengan Zod                  |
| `server/src/middlewares/rateLimit.js`    | `createRateLimiter()` dan `apiLimiter`                   |
| `server/src/utils/AppError.js`           | Class error aplikasi                                     |
| `server/src/utils/response.js`           | `sendData()` untuk respons sukses standar                |
| `server/src/lib/prisma.js`               | Prisma Client singleton                                  |
| `server/prisma.config.js`                | Konfigurasi Prisma 7 (lokasi schema, migrasi, seed, URL) |
| `server/prisma/schema.prisma`            | Schema database, belum ada model                         |
| `client/src/index.css`                   | Design token (warna, font, radius, lebar layout)         |
| `client/src/lib/api.js`                  | Wrapper fetch dan `ApiError`                             |
| `client/src/app/router.jsx`              | Daftar route                                             |
| `client/src/app/layouts/`                | Header, navigasi kiri, sidebar kanan, layout 3 kolom     |
| `client/src/components/ui/`              | Button, Input, Modal, Card, Badge                        |
| `shared/src/index.js`                    | Pintu ekspor shared                                      |

## Perubahan Database

Tidak ada model dan migrasi. Database `tindak` dan `tindak_test` hanya dibuat kosong.

## Endpoint Baru

| Method | Path          | Auth   | Keterangan                         |
| ------ | ------------- | ------ | ---------------------------------- |
| GET    | `/api/health` | Publik | Status server dan koneksi database |

Kontrak Fase 1 dan Fase 2 ditulis di `docs/API.md` dan belum diimplementasikan.

## Cara Menguji Manual

1. `npm install`
2. Siapkan database dan `.env` sesuai README.
3. `npm run dev`
4. Buka http://localhost:5173: tampil header T!indak, navigasi kiri, Beranda, dan sidebar kanan (kolom kiri hilang di bawah 1024px, kolom kanan hilang di bawah 1280px).
5. Buka http://localhost:5173/halaman-acak: tampil halaman 404.
6. Buka http://localhost:5173/api/health: tampil `{"data":{"status":"ok","db":"ok"}}`.
7. Matikan MySQL lalu buka lagi `/api/health`: tampil error `503 SERVICE_UNAVAILABLE`.
8. Hapus `SESSION_SECRET` dari `.env` lalu `npm run dev`: server gagal start dengan pesan yang menyebut variabel yang kurang.

## Hasil Tes

- `npm run lint`: ESLint tanpa error, semua file sesuai Prettier.
- `npm test`: 2 file tes, 18 tes lolos (health check ke database asli, 404, pemetaan error, validate, parseEnv).
- `npm run build`: client berhasil di-build.
- Verifikasi manual: `npm run dev` menjalankan server di 3000 dan client di 5173, `http://localhost:5173/api/health` lewat proxy mengembalikan status ok.

## Keputusan dan Alasan

- **Prisma 7.10.0** dipakai karena itu versi stabil terbaru (8.x masih RC). Prisma 7 mewajibkan `prisma.config` dan driver adapter. Untuk MySQL dipakai `@prisma/adapter-mariadb` sesuai dokumentasi resmi.
- **Prisma Client berbentuk TypeScript.** Generator `prisma-client` (pengganti `prisma-client-js` yang sudah deprecated) hanya menghasilkan file `.ts`. Node 22.18+ bisa menjalankan file `.ts` secara langsung (type stripping), jadi proyek tetap JavaScript dan tidak perlu build. Karena itu `engines.node` diset `>=22.18`. Client di-generate ke `server/src/generated/prisma` (diabaikan git), otomatis lewat `postinstall`.
- **Satu nama variabel `DATABASE_URL`.** Database tes diatur lewat `DATABASE_URL` di `.env.test`, bukan `DATABASE_URL_TEST`, supaya Prisma, server, dan tes membaca variabel yang sama.
- **Penjelasan env dipindah ke README.** Tim memutuskan tidak ada komentar di kode dan file konfigurasi, termasuk `.env.example`. Penjelasan setiap variabel ada di tabel README.
- **Variabel Google dan Turnstile opsional** di validasi env. Akan diwajibkan di fase yang memakainya.
- **express-session dan Passport belum dipasang.** Pilihan session store (memory tidak aman untuk production) lebih tepat diputuskan di Fase 1A bersama model User dan Session. Ini menghindari kode mati di Fase 0.
- **Hasil validasi disimpan di `req.validated[sumber]`.** Di Express 5 `req.query` hanya getter dan tidak bisa ditimpa. Untuk `body`, `req.body` juga diganti dengan hasil parse.
- **`GET /api/auth/me` untuk tamu membalas `{ data: null }`**, bukan 401, agar frontend tidak memperlakukan tamu sebagai error.
- **Docker memakai `mysql:8.4`** (LTS dari MySQL 8). Verifikasi lokal dilakukan dengan MariaDB 10.4 dari XAMPP, yang juga didukung Prisma untuk provider `mysql`.
- **Prettier tidak memformat `docs/PRODUCT.md`** agar dokumen produk asli tidak berubah format.

## Hal yang Belum Selesai

- `npm audit` melaporkan 6 kerentanan (1 moderate, 5 high) dari dependensi turunan Prisma (`mariadb` 3.4.x, `mysql2`, `deepmerge-ts`). Perbaikannya butuh `npm audit fix --force` yang memasang versi Prisma berbeda, jadi tidak dilakukan. Cek ulang saat Prisma merilis patch.
- `gh` CLI tidak tersedia di mesin pembuat, sehingga PR dibuat manual lewat GitHub.

## Catatan untuk Fase Berikutnya

- **Fase 1A**: tambahkan model `User` di `schema.prisma`, jalankan `npm run db:migrate -- --name add_user`, pasang express-session dengan store database dan Passport (local + Google). Daftarkan router di `server/src/routes.js`. Skema Zod register/login taruh di `shared/src/schemas/`.
- **Fase 1B dan 2B**: pakai `api` dari `client/src/lib/api.js`, buat hooks TanStack Query di `client/src/features/<fitur>/`. Error dari API berupa `ApiError` dengan `code`, `message`, `details`. Pesan validasi per field ada di `details`.
- Modul baru di server mengikuti pola `server/src/modules/health/` (routes, controller, service).
- Kirim respons sukses dengan `sendData(res, data, { status, meta })` agar formatnya konsisten.
- Rate limiter khusus endpoint sensitif dibuat dengan `createRateLimiter({ windowMs, limit, message })`.
- Setelah ada migrasi, jalankan `npm run db:test:deploy -w server` sebelum `npm test` di lokal. CI menjalankan migrasi otomatis.
