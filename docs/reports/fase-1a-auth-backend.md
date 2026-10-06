# Laporan Fase 1A: Auth Backend

- Branch: `feat/f1a-auth-api`
- Pemilik: Oscar
- Tanggal: 2026-10-03
- PR: ke `dev`

## Ringkasan

Backend autentikasi selesai: daftar dan login dengan email + password, login Google, logout, dan endpoint `me`. Session disimpan di database MySQL lewat Prisma, cookie aman (httpOnly, sameSite lax, secure di production), session ID diganti setiap login, dan endpoint sensitif diberi rate limit. Semua 6 endpoint Fase 1 di `docs/API.md` sudah diimplementasikan dan dites.

## Yang Dikerjakan

- Model `User` dan `Session` beserta migrasi `add_user_and_session`.
- Session store berbasis Prisma (`PrismaSessionStore`) dengan pembersihan session kedaluwarsa otomatis.
- Passport: serialisasi user ke session dan strategi Google OAuth 2.0 (aktif hanya jika env Google diisi).
- Endpoint `POST /register`, `POST /login`, `POST /logout`, `GET /me`, `GET /google`, `GET /google/callback` di bawah `/api/auth`.
- Password di-hash bcrypt cost 12. Login gagal selalu memberi pesan yang sama, dan waktu proses dibuat mirip walau email tidak terdaftar.
- Role `ADMIN` diambil dari `ADMIN_EMAILS` dan disamakan ulang setiap login.
- Login Google menautkan akun email yang sudah ada jika email Google terverifikasi.
- Redirect setelah login Google hanya ke path relatif (`safeRedirectPath`).
- Middleware `requireAuth` untuk endpoint yang wajib login.
- Skema Zod `registerSchema` dan `loginSchema` di `shared`, siap dipakai form Fase 1B.
- Tes otomatis menjalankan migrasi ke `tindak_test` dan menolak berjalan jika database bukan database tes.

## File Penting

| File                                              | Keterangan                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `server/prisma/schema.prisma`                     | Model `User`, `Session`, enum `UserRole`                           |
| `server/prisma/migrations/*_add_user_and_session` | Migrasi pertama                                                    |
| `server/src/modules/auth/auth.routes.js`          | Path, validasi, dan rate limit auth                                |
| `server/src/modules/auth/auth.controller.js`      | Login ke session, logout, alur Google                              |
| `server/src/modules/auth/auth.service.js`         | Register, cek password, cari atau buat user Google, `toPublicUser` |
| `server/src/config/session.js`                    | Konfigurasi cookie dan express-session                             |
| `server/src/config/passport.js`                   | Serialisasi user dan strategi Google                               |
| `server/src/lib/PrismaSessionStore.js`            | Penyimpanan session di tabel `sessions`                            |
| `server/src/middlewares/requireAuth.js`           | Balas 401 jika belum login                                         |
| `server/src/utils/safeRedirect.js`                | Validasi path redirect                                             |
| `shared/src/schemas/auth.js`                      | Skema Zod register dan login                                       |
| `shared/src/constants/auth.js`                    | `USER_ROLES`, batas panjang field, kode error login Google         |
| `server/tests/globalSetup.js`                     | Migrasi otomatis ke database tes                                   |

## Perubahan Database

Migrasi `20261003054328_add_user_and_session`:

- Tabel `users`: `id`, `name` (50), `email` (191, unik), `password_hash` (boleh null untuk akun yang hanya pakai Google), `google_id` (unik, boleh null), `avatar_url`, `role` (enum `USER`/`ADMIN`), `onboarded_at`, `last_login_at`, `created_at`, `updated_at`.
- Tabel `sessions`: `id`, `data` (TEXT), `expires_at` dengan index untuk pembersihan.

Nama tabel dan kolom memakai snake_case di database (`@@map` dan `@map`), dan camelCase di kode.

## Endpoint Baru

| Method | Path                        | Auth   | Keterangan                                |
| ------ | --------------------------- | ------ | ----------------------------------------- |
| POST   | `/api/auth/register`        | Publik | Daftar dan langsung login                 |
| POST   | `/api/auth/login`           | Publik | Login email + password                    |
| POST   | `/api/auth/logout`          | Login  | Hapus session dan cookie                  |
| GET    | `/api/auth/me`              | Publik | User saat ini atau `null`                 |
| GET    | `/api/auth/google`          | Publik | Redirect ke Google                        |
| GET    | `/api/auth/google/callback` | Publik | Kembali dari Google, redirect ke frontend |

Perubahan kontrak di `docs/API.md`:

1. `403 ACCOUNT_BANNED` dan redirect `account_banned` ditunda ke Fase 7 (disetujui saat perencanaan). Ada bagian "Catatan Ban".
2. Ditambah redirect `/login?error=google_unavailable` jika login Google belum dikonfigurasi.
3. Rate limit login diperjelas: hanya percobaan **gagal** yang dihitung.
4. Ditambah keterangan penyimpanan session dan kapan cookie dibuat.

## Cara Menguji Manual

1. `git pull`, lalu `npm install` dan `npm run db:migrate`.
2. `npm run dev`.
3. Pakai Thunder Client, Postman, atau curl ke `http://localhost:5173`:
   - `GET /api/auth/me` menghasilkan `{"data":null}`.
   - `POST /api/auth/register` dengan body `{"name":"Uji","email":"uji@example.com","password":"rahasia123"}` menghasilkan 201 dan cookie `tindak.sid`.
   - `GET /api/auth/me` (dengan cookie) mengembalikan data user.
   - `POST /api/auth/logout`, lalu `GET /api/auth/me` mengembalikan `null` lagi.
   - `POST /api/auth/login` dengan password salah menghasilkan 401 `INVALID_CREDENTIALS`. Ulangi 11 kali dan percobaan ke-11 menghasilkan 429.
4. Buka `http://localhost:5173/api/auth/google` di browser. Tanpa env Google, browser diarahkan ke `/login?error=google_unavailable`.
5. Opsional: isi env Google sesuai README bagian "Mengaktifkan Login Google", buka lagi `/api/auth/google?redirect=/`, pilih akun Google, lalu kamu kembali ke `http://localhost:5173/` dalam keadaan login.
6. Lihat isi tabel `users` dan `sessions` lewat `npm run db:studio` atau phpMyAdmin.

Uji manual lewat proxy Vite sudah dilakukan untuk langkah 3 dan 4. Langkah 5 belum diuji dengan akun Google sungguhan karena belum ada OAuth client.

## Hasil Tes

- `npm run lint`: ESLint tanpa error, semua file sesuai Prettier.
- `npm test`: 5 file tes, 69 tes lolos.
  - `auth.test.js`: register, login, logout, me, Google tanpa konfigurasi, rate limit, pergantian session ID.
  - `google.test.js`: redirect ke Google dengan `state`, penyimpanan redirect aman, callback gagal, serta logika buat atau tautkan akun Google.
  - `unit.test.js`: `safeRedirectPath`, skema shared, pengaman database tes, session store.
  - `errorHandler.test.js` dan `health.test.js` dari Fase 0, ditambah tes aturan env Google.

## Keputusan dan Alasan

- **`bcryptjs` dipakai, bukan `bcrypt`.** Algoritma dan format hash-nya sama (`$2b$12$`), tetapi tidak perlu dikompilasi saat `npm install`, sehingga aman di laptop Windows anggota tim.
- **Session store ditulis sendiri** (sekitar 80 baris) daripada memakai library pihak ketiga, karena library yang ada belum jelas dukungannya untuk Prisma 7 dengan driver adapter. Store ini memanggil Prisma dari `lib/`, bukan dari service, karena merupakan infrastruktur session, bukan logika bisnis.
- **Login email tidak memakai `passport-local`.** Validasi Zod dan kode error khusus (`INVALID_CREDENTIALS`) lebih mudah ditangani langsung di service. Passport tetap dipakai untuk session dan Google.
- **Rate limiter dibuat per `createApp()`**, supaya setiap tes mendapat hitungan yang bersih. Middleware session tetap satu instance agar listener tidak menumpuk.
- **Callback Google lewat port 5173** (proxy Vite) agar cookie session tetap satu situs dengan frontend.
- **Env Google**: cukup `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`, dan keduanya harus diisi bersama. `GOOGLE_CALLBACK_URL` punya nilai default. Aturan awal yang mewajibkan ketiganya ternyata membuat server gagal start dengan isi `.env.example`, sehingga diperbaiki saat uji manual dan diberi tes.
- **Batas password 72 byte**, bukan 72 karakter, karena bcrypt hanya memakai 72 byte pertama.
- **Migrasi tes otomatis** lewat `globalSetup`, sehingga perintah manual `db:test:deploy` tidak perlu lagi sebelum `npm test`.
- **`db:migrate` otomatis menjalankan `prisma generate`** lewat script `postdb:migrate`, karena Prisma 7 tidak lagi melakukannya sendiri.

## Hal yang Belum Selesai

- Cek ban (`ACCOUNT_BANNED`) ditunda ke Fase 7, sesuai keputusan saat perencanaan.
- Endpoint untuk menandai onboarding selesai (`needsOnboarding` menjadi `false`) belum ada. Bisa dibuat bersama Halaman Sambutan.
- Lupa password belum ada di daftar endpoint mana pun. Butuh layanan email, jadi perlu diputuskan apakah masuk scope lomba.
- Login Google belum diuji dengan akun Google sungguhan.
- Ada 1 user uji (`manual...@example.com`) di database development milik Oscar, hasil uji manual. Boleh dihapus.

## Catatan untuk Fase Berikutnya

- **Fase 1B (frontend)**:
  - Panggil `GET /api/auth/me` sekali saat aplikasi dibuka (TanStack Query, misalnya key `['auth','me']`). Nilai `null` berarti tamu.
  - Form daftar dan login pakai `registerSchema` dan `loginSchema` dari `@tindak/shared`, dan tampilkan `error.details` per field.
  - Tombol Google: `window.location.href = '/api/auth/google?redirect=' + encodeURIComponent(pathSekarang)`.
  - Halaman `/login` membaca `?error=google_failed` atau `?error=google_unavailable` lalu menampilkan pesan.
  - Setelah login, logout, atau register, invalidate query `me`.
- **Fase 2A dan seterusnya**: pakai `requireAuth` untuk endpoint wajib login. User yang sedang login ada di `req.user` (objek Prisma lengkap). Kirim ke client hanya lewat `toPublicUser`.
- Untuk tes yang butuh user login, pakai `createUser()` dari `tests/helpers/db.js` lalu login dengan `request.agent(app)`. Tambahkan tabel baru ke `resetDatabase()` dengan urutan aman terhadap foreign key.
