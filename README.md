# T!indak

Board pengaduan masalah fisik berbasis komunitas. Warga, siswa, atau karyawan melaporkan jalan rusak, sampah, toilet rusak, atau lampu mati ke sebuah **Board** (mirip subreddit). Komunitas memberi dukungan dan reaksi, lalu **Penindak** board menindaklanjuti sampai pelapor mengonfirmasi selesai.

Alur produk lengkap ada di [docs/PRODUCT.md](docs/PRODUCT.md). Kontrak API ada di [docs/API.md](docs/API.md). Status pengerjaan ada di [docs/PROGRESS.md](docs/PROGRESS.md).

## Stack

| Bagian  | Teknologi                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------- |
| Server  | Node.js 22.18+ (ESM), Express 5, Prisma 7 + MySQL 8, Zod, helmet, cors, express-rate-limit, pino-http |
| Client  | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4                                          |
| Shared  | Skema Zod, enum, dan konstanta yang dipakai server dan client                                         |
| Testing | Vitest + Supertest                                                                                    |
| Tooling | npm workspaces, ESLint (flat config), Prettier, GitHub Actions                                        |

## Struktur Folder

```
tindak/
  client/   React + Vite (port 5173)
  server/   Express + Prisma (port 3000)
  shared/   Zod, enum, konstanta
  docs/     produk, kontrak API, progres, laporan fase
```

## Setup Lokal Langkah demi Langkah

### 1. Siapkan alat

- [Node.js](https://nodejs.org) versi 22.18 atau lebih baru. Cek dengan `node -v`.
- Git.
- Salah satu database MySQL: XAMPP, MySQL lokal, atau Docker.

### 2. Clone dan install

```bash
git clone https://github.com/oscarkuanta/tindak.git
cd tindak
npm install
```

`npm install` juga otomatis menjalankan `prisma generate`.

### 3. Siapkan database

Kita butuh dua database: `tindak` (untuk development) dan `tindak_test` (khusus tes, isinya boleh dihapus kapan saja).

**Pilihan A: XAMPP**

1. Buka XAMPP Control Panel, klik **Start** pada MySQL.
2. Buka `http://localhost/phpmyadmin`, tab **SQL**, jalankan:

   ```sql
   CREATE DATABASE IF NOT EXISTS tindak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE IF NOT EXISTS tindak_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. User bawaan XAMPP adalah `root` tanpa password, jadi URL-nya `mysql://root@localhost:3306/tindak`.

**Pilihan B: MySQL lokal**

Jalankan SQL yang sama seperti di atas lewat MySQL Workbench atau `mysql -u root -p`. Sesuaikan user dan password di URL, contoh `mysql://root:passwordku@localhost:3306/tindak`.

**Pilihan C: Docker**

```bash
docker compose up -d
```

Ini menjalankan MySQL 8 di port 3306 dengan password root `root`, dan otomatis membuat database `tindak` dan `tindak_test`. Matikan MySQL XAMPP dulu jika sedang jalan, karena portnya sama.

### 4. Buat file env

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Lalu buka kedua file dan sesuaikan `DATABASE_URL` dengan database kamu. Isi `SESSION_SECRET` dan `IP_HASH_SECRET` di `.env` dengan string acak. Cara membuatnya:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

File `.env` dan `.env.test` tidak pernah di-commit.

### 5. Jalankan migrasi dan aplikasi

```bash
npm run db:migrate
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000
- Cek kesehatan lewat proxy: http://localhost:5173/api/health harus menampilkan `{"data":{"status":"ok","db":"ok"}}`

### 6. Jalankan lint dan tes

```bash
npm run lint
npm test
```

`npm test` otomatis menjalankan migrasi ke database `tindak_test` sebelum tes dimulai, dan menolak berjalan jika `DATABASE_URL` di `.env.test` bukan database tes. Setelah `git pull` yang membawa migrasi baru, jalankan juga `npm run db:migrate` agar database development ikut diperbarui.

## Variabel Environment

File `.env` di root dipakai oleh server dan Prisma. File `.env.test` dipakai saat `npm test`.

| Variabel                  | Wajib      | Penjelasan                                                                                                                                                                                                           |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | Tidak      | `development`, `test`, atau `production`. Default `development`                                                                                                                                                      |
| `PORT`                    | Tidak      | Port server Express. Default `3000`                                                                                                                                                                                  |
| `CLIENT_URL`              | Tidak      | Alamat frontend, dipakai untuk CORS dan redirect setelah login Google. Default `http://localhost:5173`                                                                                                               |
| `DATABASE_URL`            | Ya         | Koneksi MySQL, format `mysql://USER:PASSWORD@HOST:PORT/NAMA_DB`. Di `.env.test` arahkan ke `tindak_test`                                                                                                             |
| `SESSION_SECRET`          | Ya         | Kunci rahasia untuk menandatangani cookie session. Minimal 32 karakter acak                                                                                                                                          |
| `IP_HASH_SECRET`          | Ya         | Kunci rahasia untuk meng-hash IP sebelum disimpan (IP asli tidak pernah disimpan). Minimal 16 karakter                                                                                                               |
| `GOOGLE_CLIENT_ID`        | Tidak      | Client ID OAuth dari Google Cloud Console. Kosongkan bersama `GOOGLE_CLIENT_SECRET` untuk mematikan login Google                                                                                                     |
| `GOOGLE_CLIENT_SECRET`    | Tidak      | Client secret OAuth dari Google Cloud Console. Wajib diisi jika `GOOGLE_CLIENT_ID` diisi                                                                                                                             |
| `GOOGLE_CALLBACK_URL`     | Tidak      | URL callback yang didaftarkan di Google. Default `CLIENT_URL` + `/api/auth/google/callback`                                                                                                                          |
| `ADMIN_EMAILS`            | Tidak      | Daftar email Admin platform, dipisah koma. Contoh `a@x.com,b@y.com`                                                                                                                                                  |
| `BOARD_ADMIN_EMAILS`      | Tidak      | Daftar email Admin Board (pemberi status Official), dipisah koma. Jika email juga ada di `ADMIN_EMAILS`, yang dipakai ADMIN                                                                                          |
| `TURNSTILE_SECRET_KEY`    | Production | Secret key Cloudflare Turnstile untuk captcha form laporan. Kosong di development berarti memakai kunci test `1x0000000000000000000000000000000AA` (selalu lolos, tanpa internet). Production wajib memakai key asli |
| `VITE_TURNSTILE_SITE_KEY` | Ya         | Site key publik Turnstile untuk widget di frontend. Development: kunci test `1x00000000000000000000AA`                                                                                                               |
| `NSFW_ENABLED`            | Tidak      | `true` untuk mengaktifkan scan foto tidak pantas (nsfwjs). Default `false`. Aktifkan di production                                                                                                                   |
| `UPLOAD_DIR`              | Tidak      | Folder penyimpanan foto laporan. Default `server/uploads` (diabaikan git)                                                                                                                                            |
| `JOBS_ENABLED`            | Tidak      | `false` untuk mematikan job terjadwal (konfirmasi otomatis 3 hari dan Board Tidak Aktif 30 hari). Default aktif                                                                                                      |
| `LOG_LEVEL`               | Tidak      | Level log pino: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`                                                                                                                                         |

Variabel bertanda "Fase N" boleh dikosongkan sampai fase tersebut dikerjakan.

## Foto Laporan dan Captcha

- Foto laporan disimpan di `server/uploads` (atau `UPLOAD_DIR`) dan disajikan di `/api/uploads/...`. Folder ini tidak ikut git. Semua penyimpanan lewat `server/src/lib/storage.js`, jadi saat deploy cukup mengganti modul itu ke cloud storage.
- Captcha memakai Cloudflare Turnstile. Kunci test di `.env.example` membuat widget selalu menampilkan "Success!" dan server selalu menerima. Untuk kunci asli, daftar di dashboard Cloudflare → Turnstile, lalu isi `VITE_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY`.
- Scan foto tidak pantas memakai nsfwjs dengan `@tensorflow/tfjs` (versi JavaScript murni, tanpa kompilasi). Model dimuat saat foto pertama diperiksa, sekitar 1 detik, lalu sekitar 1 detik per foto.

## Akun Demo

Jalankan `npm run db:seed` untuk membuat akun, Board, pengikut, dan 5 laporan contoh dengan foto. Board SMKN 1 Surabaya berisi satu laporan di setiap status untuk mencoba antrean dan kanban. Laporan tamu contoh bisa dilacak di `http://localhost:5173/lacak/DEMAK234?secret=rahasia-demo-tindak`. Aman dijalankan berulang kali. Semua akun memakai password `tindak123`.

| Email                    | Role        | Keterangan                                                                             |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------- |
| `admin@tindak.test`      | ADMIN       | Moderator                                                                              |
| `boardadmin@tindak.test` | BOARD_ADMIN | Pemberi status Official                                                                |
| `budi@tindak.test`       | USER        | Penindak Utama 3 Board (termasuk SMKN 1 Surabaya, Official), punya 1 undangan Penindak |
| `siti@tindak.test`       | USER        | Penindak Utama 2 Board, Penindak di SMKN 1 Surabaya                                    |

Akun demo hanya untuk development. Jangan jalankan seed di server production.

## Mengaktifkan Login Google

Tanpa langkah ini aplikasi tetap jalan, hanya tombol login Google yang mengarah ke pesan "belum tersedia".

1. Buka [Google Cloud Console](https://console.cloud.google.com), buat project baru.
2. Menu **APIs & Services → OAuth consent screen**: pilih **External**, isi nama aplikasi dan email, lalu tambahkan email anggota tim sebagai **Test users**.
3. Menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**: pilih **Web application**.
4. Di **Authorized redirect URIs** isi `http://localhost:5173/api/auth/google/callback`.
5. Salin **Client ID** dan **Client secret** ke `.env` di `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`, lalu restart `npm run dev`.

Callback sengaja lewat port 5173 (proxy Vite) agar cookie login tetap satu situs dengan frontend.

## Daftar Script

Semua dijalankan dari folder root.

| Script                                         | Fungsi                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                                  | Menjalankan server (3000) dan client (5173) bersamaan                        |
| `npm run build`                                | Build client untuk production ke `client/dist`                               |
| `npm run lint`                                 | ESLint dan cek format Prettier                                               |
| `npm run format`                               | Merapikan semua file dengan Prettier                                         |
| `npm test`                                     | Menjalankan tes server (Vitest + Supertest) ke database `tindak_test`        |
| `npm run db:generate`                          | Membuat ulang Prisma Client setelah `schema.prisma` berubah                  |
| `npm run db:migrate`                           | `prisma migrate dev`: membuat dan menjalankan migrasi di database dev        |
| `npm run db:deploy`                            | `prisma migrate deploy`: menjalankan migrasi yang sudah ada (CI, production) |
| `npm run db:seed`                              | Mengisi data awal dari `server/prisma/seed.js`                               |
| `npm run db:studio`                            | Membuka Prisma Studio untuk melihat isi database                             |
| `npm run db:reset`                             | Menghapus semua data dan menjalankan ulang migrasi. Hati-hati                |
| `npm run db:test:deploy -w server`             | Menjalankan migrasi ke database `tindak_test`                                |
| `npm run make-admin -- email@contoh.com`       | Menjadikan user dengan email itu sebagai Admin                               |
| `npm run make-board-admin -- email@contoh.com` | Menjadikan user dengan email itu sebagai Admin Board                         |

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur Git, cara review PR, dan aturan kerja tim.
