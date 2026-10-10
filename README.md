# T!ndak

Board pengaduan masalah fisik berbasis komunitas. Warga, siswa, atau karyawan melaporkan jalan berlubang, sampah menumpuk, toilet rusak, atau lampu mati ke sebuah **Board** milik tempat itu. Komunitas memberi dukungan dan reaksi agar masalah paling mendesak naik ke atas, lalu **Penindak** Board menindaklanjuti sampai pelapor mengonfirmasi selesai.

- **Website:** https://tindakserver-production.up.railway.app
- **Video demo:** link YouTube menyusul
- **Akun demo:** semua memakai password `demo1234`, misalnya `siti@demo.test` (warga), `ratna@demo.test` (Penindak Utama), `admin@demo.test` (Admin), `adminboard@demo.test` (Admin Board). Daftar lengkap di [docs/DEMO.md](docs/DEMO.md).

## Tim

| Nama                            | Peran                     |
| ------------------------------- | ------------------------- |
| Ascarino Ahza Kuanta            | Backend Developer         |
| Akmal Maulana Ghani             | Frontend Developer        |
| Muhammad Izzudin Al Qosam Yahya | UI/UX Designer dan Tester |

## Tema dan Subtema

Karya ini dibuat untuk tema PRISMA 2026 **"Inspiring Digital Experiences: Illuminating the Web for Future Solutions"** (LUMINE).

- **Subtema utama: Transformasi Digital & Layanan Publik (Smart Village/Govtech).** Kelurahan, sekolah, dan pengelola fasilitas mendapat antrean kerja digital yang transparan tanpa birokrasi kertas, dan warga bisa memantau penanganan laporannya secara real-time.
- **Subtema pendukung: Lingkungan & Manajemen Berkelanjutan (Smart Environment).** T!ndak memfasilitasi pelaporan isu lingkungan dan kerusakan ruang publik oleh warga, lalu mengukur seberapa cepat penanganannya.
- **Lighting (mencerahkan):** setiap laporan punya status dan riwayat yang bisa dilihat publik, jadi warga tahu masalahnya sedang ditangani atau belum.
- **Inspire (menginspirasi):** dukungan, reaksi, dan rating mengajak warga ikut menjaga lingkungannya, bukan hanya mengeluh.

## Latar Belakang

Masalah fisik di sekitar kita sering dibiarkan lama: jalan berlubang, selokan tersumbat, lampu jalan mati, atau toilet sekolah rusak. Biasanya keluhan disampaikan lewat grup WhatsApp, kotak saran, atau mulut ke mulut. Akibatnya:

1. Laporan tenggelam di antara pesan lain dan tidak jelas siapa yang harus menangani.
2. Pelapor tidak tahu apakah laporannya dibaca, sedang dikerjakan, atau diabaikan.
3. Pengelola sulit menentukan mana yang paling mendesak dan berbahaya.
4. Warga yang mengalami masalah yang sama mengirim laporan berulang.
5. Tidak ada data untuk menilai seberapa cepat pengelola merespons.

## Solusi

T!ndak memberi setiap tempat sebuah Board seperti forum, misalnya Board sekolah, kampus, jalan, RT/RW, atau fasilitas umum.

1. **Lapor mudah:** cukup judul, kategori, tingkat bahaya, lokasi, dan foto. Bisa tanpa akun (dengan Kode Lacak) atau anonim.
2. **Prioritas dari warga:** warga lain menekan Dukung atau memberi reaksi Berbahaya, Sudah Lama, dan Mengganggu, sehingga laporan mendesak naik ke atas dan laporan ganda berkurang.
3. **Penindakan transparan:** Penindak bekerja lewat antrean atau kanban dengan status Baru, Perlu Info, Diproses, Menunggu Konfirmasi, Selesai, Dibuka Ulang, Ditolak, atau Duplikat. Setiap perubahan tercatat dan pelapor yang mengonfirmasi selesai.
4. **Kepercayaan terukur:** rating warga dan tingkat tanggap membentuk Skor Kepercayaan Board. Board resmi bisa diverifikasi menjadi Official oleh Admin Board.
5. **Aman dari penyalahgunaan:** Tandai Pelanggaran, sembunyi otomatis, filter foto tidak pantas, ban, dan Freeze Board.

## Dampak yang Bisa Diukur

Dashboard Statistik setiap Board menghitung indikator berikut secara otomatis, sehingga dampak T!ndak bisa dibuktikan dengan angka:

| Indikator                            | Arti                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| Tingkat tanggap                      | Persentase laporan yang direspons Penindak                    |
| Rata-rata waktu penanganan           | Waktu dari laporan masuk sampai selesai                       |
| Berbahaya tepat waktu                | Persentase laporan Berbahaya yang selesai sebelum batas waktu |
| Laporan masuk dan selesai per minggu | Tren partisipasi warga dan penyelesaian                       |
| Kinerja per Penindak                 | Jumlah laporan yang ditangani setiap Penindak                 |
| Laporan per kategori                 | Jenis masalah yang paling sering muncul di tempat itu         |

## Inovasi Dibanding Cara yang Sudah Ada

| Grup chat, kotak saran, formulir online | T!ndak                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Laporan bercampur dengan obrolan lain   | Satu Board per tempat, laporan berkategori                                                         |
| Pelapor tidak tahu kelanjutannya        | Status dan riwayat terbuka, notifikasi realtime, Kode Lacak untuk tamu                             |
| Laporan sama dikirim berkali-kali       | Warga cukup Dukung, Penindak bisa menandai Duplikat                                                |
| Tidak ada urutan prioritas              | Skor prioritas dari dukungan, reaksi, dan tingkat bahaya, plus batas waktu untuk laporan Berbahaya |
| Tidak jelas mana kanal resmi            | Skor Kepercayaan dan verifikasi Official                                                           |
| Selesai atau tidak hanya kata pengelola | Pelapor yang mengonfirmasi, dan bisa membuka ulang jika belum beres                                |

## Screenshot

| Beranda                                        | Halaman Board                        | Kanban Penindak                              |
| ---------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| ![Beranda](docs/screenshots/beranda.png)       | ![Board](docs/screenshots/board.png) | ![Kanban](docs/screenshots/kanban.png)       |
| **Dashboard Verifikasi**                       | **Panel Admin**                      | **Dashboard Statistik**                      |
| ![Verifikasi](docs/screenshots/verifikasi.png) | ![Admin](docs/screenshots/admin.png) | ![Statistik](docs/screenshots/statistik.png) |

## Fitur

- **Board per tempat:** sekolah, kampus, kantor, jalan, RT/RW, fasilitas umum. Siapa pun bisa membuat Board, semua mulai sebagai Komunitas.
- **Lapor tanpa akun:** tamu melapor dengan foto dan captcha, lalu memantau lewat Kode Lacak. Bisa juga melapor anonim saat login.
- **Penindakan berstatus:** antrean daftar atau kanban, permintaan info ke pelapor, foto sebelum dan sesudah, konfirmasi oleh pelapor.
- **Prioritas dari warga:** Dukung dan reaksi (Berbahaya, Sudah Lama, Mengganggu) membentuk skor prioritas dan feed Ramai. Laporan Berbahaya punya batas waktu.
- **Kepercayaan Board:** rating bintang dan tingkat tanggap menghasilkan Skor Kepercayaan otomatis (Baru, Terpercaya, Perlu Waspada).
- **Verifikasi Official:** Board yang memenuhi syarat masuk antrean, lalu Admin Board memutuskan Jadikan Official, Lewati, atau Cabut. Semua keputusan tercatat.
- **Moderasi:** Tandai Pelanggaran, sembunyi otomatis, foto tidak pantas diburamkan, ban akun/perangkat/IP, Freeze Board dengan durasi dan unfreeze otomatis, audit log.
- **Notifikasi dan realtime:** lonceng notifikasi, antrean dan status berubah tanpa refresh (Socket.IO).
- **Dashboard Penindak:** statistik per status, waktu penanganan, Berbahaya tepat waktu, tren mingguan, kinerja per Penindak, ekspor CSV.
- **Responsif:** nyaman di desktop, tablet, dan HP, dengan navigasi bawah di HP.

## Arsitektur

```
Browser (React + TanStack Query + Socket.IO client)
        │  satu domain: /  /api  /socket.io  /api/uploads
        ▼
Express 5 (satu proses Node.js)
  ├─ routes → controller → service   (validasi Zod dari folder shared)
  ├─ Socket.IO (session cookie yang sama, room user/board/laporan)
  ├─ job terjadwal (node-cron): konfirmasi otomatis, Board Tidak Aktif, skor, peringatan batas waktu
  └─ menyajikan client/dist di production
        │
        ├─ Prisma 7 → MySQL 8 / MariaDB
        └─ folder upload (volume permanen di production)
```

Alur produk lengkap ada di [docs/PRODUCT.md](docs/PRODUCT.md). Kontrak API ada di [docs/API.md](docs/API.md). Struktur database ada di [docs/DATABASE.md](docs/DATABASE.md). Status pengerjaan ada di [docs/PROGRESS.md](docs/PROGRESS.md). Dokumen rilis: [docs/DEPLOY.md](docs/DEPLOY.md), [docs/DEMO.md](docs/DEMO.md), [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md), [docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md).

## Stack

| Bagian  | Teknologi                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------- |
| Server  | Node.js 22.18+ (ESM), Express 5, Prisma 7 + MySQL 8, Zod, Socket.IO, helmet, express-rate-limit, pino |
| Client  | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4                                          |
| Shared  | Skema Zod, enum, dan konstanta yang dipakai server dan client                                         |
| Testing | Vitest + Supertest                                                                                    |
| Tooling | npm workspaces, ESLint (flat config), Prettier, GitHub Actions                                        |

## Struktur Folder

```
tindak/
  client/                 React + Vite (port 5173)
    src/app/              router dan layout (header, panel kiri, navigasi bawah)
    src/pages/            satu folder per halaman
    src/features/         hook TanStack Query dan API per fitur
    src/components/       komponen per fitur dan komponen dasar (ui/, icons/)
  server/                 Express + Prisma (port 3000)
    prisma/               schema.prisma, migrasi, seed, foto demo
    src/modules/          satu folder per fitur: routes, controller, service
    src/middlewares/      auth, validasi, rate limit, penanganan error
    src/jobs/             job terjadwal
    tests/                tes integrasi Supertest dan unit test
  shared/                 skema Zod, enum, konstanta, rumus skor
  docs/                   produk, kontrak API, database, deploy, demo, laporan fase
```

Alur di server selalu routes → controller → service. Prisma hanya dipanggil di service, dan semua input divalidasi skema Zod dari folder `shared` yang juga dipakai form di client.

## Database

MySQL 8 dengan 18 tabel yang saling berelasi. Diagram relasi (ERD), aturan penamaan, dan alasan desainnya ada di [docs/DATABASE.md](docs/DATABASE.md).

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
| `UPLOAD_DIR`              | Production | Folder penyimpanan foto laporan. Default `server/uploads` (diabaikan git). Di production wajib folder permanen (volume)                                                                                              |
| `JOBS_ENABLED`            | Tidak      | `false` untuk mematikan job terjadwal (konfirmasi otomatis 3 hari dan Board Tidak Aktif 30 hari). Default aktif                                                                                                      |
| `LOG_LEVEL`               | Tidak      | Level log pino: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`                                                                                                                                         |

Di production server juga menolak menyala jika `SESSION_SECRET` atau `IP_HASH_SECRET` masih nilai contoh atau `CLIENT_URL` bukan https. Daftar lengkap variabel production ada di [docs/DEPLOY.md](docs/DEPLOY.md).

## Foto Laporan dan Captcha

- Foto laporan disimpan di `server/uploads` (atau `UPLOAD_DIR`) dan disajikan di `/api/uploads/...`. Folder ini tidak ikut git. Di production, `UPLOAD_DIR` diarahkan ke volume permanen. Semua penyimpanan lewat `server/src/lib/storage.js`, jadi jika nanti pindah ke cloud storage cukup mengganti modul itu.
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

Akun di atas hanya untuk development. Untuk lingkungan demo atau lomba, pakai **data demo** yang lebih lengkap: `npm run db:seed:demo` membuat 45 akun (semua role, password `demo1234`), 8 Board di Surabaya dan Sidoarjo, dan 81 laporan. Rinciannya di [docs/DEMO.md](docs/DEMO.md).

## Mengaktifkan Login Google

Tanpa langkah ini aplikasi tetap jalan, hanya tombol login Google yang mengarah ke pesan "belum tersedia".

1. Buka [Google Cloud Console](https://console.cloud.google.com), buat project baru.
2. Menu **APIs & Services → OAuth consent screen**: pilih **External**, isi nama aplikasi dan email, lalu tambahkan email anggota tim sebagai **Test users**.
3. Menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**: pilih **Web application**.
4. Di **Authorized redirect URIs** isi `http://localhost:5173/api/auth/google/callback`.
5. Salin **Client ID** dan **Client secret** ke `.env` di `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`, lalu restart `npm run dev`.

Callback sengaja lewat port 5173 (proxy Vite) agar cookie login tetap satu situs dengan frontend.

## Realtime dan Deploy Satu Link

Notifikasi dan pembaruan tanpa refresh memakai Socket.IO di server Express yang sama (`/socket.io`). Saat development, Vite meneruskan `/api` dan `/socket.io` ke server di port 3000.

Untuk production, cukup satu service dan satu alamat:

1. `npm run build` membuat frontend di `client/dist`.
2. `npm run db:deploy` menjalankan migrasi.
3. `npm start` dengan `NODE_ENV=production`. Server menyajikan frontend, `/api`, `/socket.io`, dan `/uploads` dari alamat yang sama, jadi `CLIENT_URL` diisi alamat situs itu sendiri.

Pakai hosting yang servernya selalu menyala (misalnya Railway atau VPS), bukan hosting serverless seperti Vercel, karena Socket.IO, job terjadwal, dan folder upload butuh proses yang terus berjalan. Konfigurasi Railway ada di `railway.json`, panduan langkah demi langkah di [docs/DEPLOY.md](docs/DEPLOY.md).

## Daftar Script

Semua dijalankan dari folder root.

| Script                                         | Fungsi                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`                                  | Menjalankan server (3000) dan client (5173) bersamaan                                              |
| `npm run build`                                | Build client untuk production ke `client/dist`                                                     |
| `npm start`                                    | Menjalankan server. Dengan `NODE_ENV=production`, server juga menyajikan `client/dist` (satu link) |
| `npm run lint`                                 | ESLint dan cek format Prettier                                                                     |
| `npm run format`                               | Merapikan semua file dengan Prettier                                                               |
| `npm test`                                     | Menjalankan tes server (Vitest + Supertest) ke database `tindak_test`, lalu tes client             |
| `npm run db:generate`                          | Membuat ulang Prisma Client setelah `schema.prisma` berubah                                        |
| `npm run db:migrate`                           | `prisma migrate dev`: membuat dan menjalankan migrasi di database dev                              |
| `npm run db:deploy`                            | `prisma migrate deploy`: menjalankan migrasi yang sudah ada (CI, production)                       |
| `npm run db:seed`                              | Mengisi data awal dari `server/prisma/seed.js`                                                     |
| `npm run db:seed:demo`                         | Mengisi data demo lengkap ke database kosong (tambahkan `-- --reset` untuk mengosongkan dulu)      |
| `npm run smoke -- https://alamat-situs`        | Cek cepat situs yang berjalan dengan akun demo (hanya membaca data)                                |
| `npm run db:studio`                            | Membuka Prisma Studio untuk melihat isi database                                                   |
| `npm run db:reset`                             | Menghapus semua data dan menjalankan ulang migrasi. Hati-hati                                      |
| `npm run db:test:deploy -w server`             | Menjalankan migrasi ke database `tindak_test`                                                      |
| `npm run make-admin -- email@contoh.com`       | Menjadikan user dengan email itu sebagai Admin                                                     |
| `npm run make-board-admin -- email@contoh.com` | Menjadikan user dengan email itu sebagai Admin Board                                               |

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur Git, cara review PR, dan aturan kerja tim.
