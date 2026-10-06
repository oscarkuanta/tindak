# Laporan Fase 2A: Board Backend

- Branch: `feat/f2a-board-api`
- Pemilik: Oscar
- Tanggal: 2026-10-06
- PR: ke `dev`

## Ringkasan

Backend Board selesai dan langsung cocok dengan frontend Fase 2B yang sudah ada di `dev`. User login bisa membuat Board (selalu berstatus Komunitas), mencari Board, melihat detail, dan pemilik bisa mengatur Board serta kategorinya. Role website `BOARD_ADMIN` ditambahkan untuk Fase 8. Ada seed dengan 4 akun demo dan 5 Board.

## Yang Dikerjakan

- **Tugas awal**: PROGRESS 1A dan 1B menjadi Selesai. Aturan PR tanpa approval wajib di `AGENTS.md`, `CONTRIBUTING.md`, dan template PR. File `.github/copilot-instructions.md` dan `GEMINI.md`. Aturan "tanpa Co-Authored-By" dan aturan untuk AI tanpa akses terminal di `AGENTS.md`.
- **Role BOARD_ADMIN**: enum, env `BOARD_ADMIN_EMAILS`, penentuan role saat daftar atau login (email maupun Google), `npm run make-board-admin`, middleware `requireBoardAdmin`.
- **Database**: model `Board`, `BoardMember`, `Category` dan 5 enum.
- **Shared**: daftar 514 kabupaten/kota, konstanta Board tambahan, kode error Board, skema request server yang ketat.
- **11 endpoint**: 10 dari prompt ditambah `PUT /api/boards/:slug/categories/order` yang sudah dipakai frontend 2B.
- **Hak akses**: `getBoardMembership(boardId, userId)` dan middleware `requireBoardRole(...roles)` yang mengisi `req.board` dan `req.membership`.
- **Seed** yang aman dijalankan ulang.
- **Perbaikan bug di shared**: `dangerousTargetHours` di skema update punya default 48, sehingga PATCH yang hanya mengubah nama diam-diam mengembalikan target waktu ke 48 jam. Diperbaiki di skema server dan skema form frontend (tidak mengubah perilaku form).

## Perbedaan Prompt dengan Dokumen

Prompt meminta dokumen diikuti jika bertentangan. Frontend 2B sudah dibuat dari `docs/API.md`, jadi nama di dokumen yang dipakai:

| Prompt                            | Dipakai (dokumen dan frontend)                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `scopeType`                       | `type` (enum Prisma `BoardType`)                                        |
| `dangerSlaHours` 1–168            | `dangerousTargetHours` 1–720                                            |
| `coverUrl`                        | `coverImageUrl`                                                         |
| Deskripsi 20–500, jabatan maks 60 | 20–1000, maks 80                                                        |
| `409 BOARD_LIMIT_REACHED`         | `403 BOARD_LIMIT_REACHED`                                               |
| Akhiran slug acak 4 huruf         | Akhiran `-2`, `-3`                                                      |
| `limit` di pencarian              | `pageSize`                                                              |
| `trust: null`                     | `trustScore: null`, `trustLabel: "NEW"`                                 |
| `myRole`                          | `viewer.role`                                                           |
| `MAX_OWNED_BOARDS`                | `BOARD_CREATION_LIMIT` (sudah dipakai frontend)                         |
| `GET /meta/cities` maks 20        | Tanpa `q`: semua kota (frontend memfilter sendiri). Dengan `q`: maks 20 |

Tambahan dari prompt yang dimasukkan ke dokumen: `owner` dan `status` di detail, aturan Board `FROZEN`, nama kota resmi, `sortOrder` di kategori.

Dua permintaan prompt diganti karena aturan tim "kode tanpa komentar": komentar di `.env.example` dipindah ke tabel env di README, dan TODO Fase 4 ditulis di `docs/API.md` (bagian DELETE kategori) dan di laporan ini.

## File Penting

| File                                            | Keterangan                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `server/prisma/schema.prisma`                   | Model `Board`, `BoardMember`, `Category`, enum Board, `UserRole.BOARD_ADMIN` |
| `server/src/modules/boards/boards.service.js`   | Logika Board, kategori, pencarian, kota                                      |
| `server/src/modules/boards/boards.ranking.js`   | Fungsi murni urutan pencarian (`compareSearchResults`) dan Board mirip       |
| `server/src/modules/boards/boards.presenter.js` | Bentuk respons `BoardCard` dan `Board`                                       |
| `server/src/modules/boards/boards.routes.js`    | Route `/boards`, `/me/boards`, `/meta/cities`                                |
| `server/src/middlewares/boardAccess.js`         | `requireBoardRole(...roles)`                                                 |
| `server/src/middlewares/auth.js`                | Ditambah `requireBoardAdmin`                                                 |
| `server/src/utils/slugify.js`                   | `slugify`, `boardBaseSlug`, `nextAvailableSlug`                              |
| `server/src/modules/auth/auth.service.js`       | `roleForNewUser`, `roleForLogin`, `promoteUser`                              |
| `server/scripts/make-board-admin.js`            | Script Admin Board                                                           |
| `server/prisma/seed.js`                         | Akun dan Board demo                                                          |
| `shared/src/constants/cities.js`                | 514 kabupaten/kota                                                           |
| `shared/src/schemas/boards.js`                  | Skema request server (`*RequestSchema`, `*QuerySchema`)                      |

## Perubahan Database

Migrasi `20261006013835_add_boards_and_board_admin`:

- Enum `UserRole` ditambah `BOARD_ADMIN`.
- Enum baru `BoardType`, `BoardVerification`, `BoardStatus`, `BoardMemberRole`, `BoardMemberStatus`.
- Tabel `boards`: slug unik, index `name`, `city`, `(city, type)`, `verification`, `owner_id`. Relasi `owner_id` (dibatasi, user pemilik tidak bisa dihapus selama punya Board) dan `verified_by_id` (menjadi null jika user dihapus).
- Tabel `board_members`: unik `(board_id, user_id)`, index `(user_id, status)`.
- Tabel `categories`: unik `(board_id, name)`, index `(board_id, sort_order)`, kolom `is_default`.

## Endpoint Baru

| Method | Path                                 | Auth   | Keterangan               |
| ------ | ------------------------------------ | ------ | ------------------------ |
| POST   | `/api/boards`                        | Login  | Buat Board, 10 per jam   |
| GET    | `/api/boards/search`                 | Publik | Cari dan filter          |
| GET    | `/api/boards/similar`                | Publik | Board mirip di kota sama |
| GET    | `/api/boards/:slug`                  | Publik | Detail                   |
| PATCH  | `/api/boards/:slug`                  | OWNER  | Ubah info                |
| POST   | `/api/boards/:slug/categories`       | OWNER  | Tambah kategori          |
| PUT    | `/api/boards/:slug/categories/order` | OWNER  | Urutkan semua kategori   |
| PATCH  | `/api/boards/:slug/categories/:id`   | OWNER  | Ganti nama atau urutan   |
| DELETE | `/api/boards/:slug/categories/:id`   | OWNER  | Hapus kategori           |
| GET    | `/api/me/boards`                     | Login  | Board yang dikelola      |
| GET    | `/api/meta/cities`                   | Publik | Daftar kota              |

## Cara Menguji Manual

Siapkan dulu:

```bash
git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Contoh dengan curl. Cookie disimpan di `jar.txt`, dan semua request lewat proxy `http://localhost:5173`. Di Windows, jalankan di Git Bash.

```bash
B=http://localhost:5173/api

curl -c jar.txt -b jar.txt -H "Content-Type: application/json" -d '{"email":"budi@tindak.test","password":"tindak123"}' $B/auth/login

curl "$B/meta/cities?q=surabaya"
curl "$B/boards/search?q=surabaya"
curl "$B/boards/search?verification=OFFICIAL"
curl "$B/boards/search?city=Kabupaten%20Sidoarjo&page=1&pageSize=2"
curl "$B/boards/similar?name=Jl%20Rungkut&city=Kota%20Surabaya"
curl -b jar.txt $B/boards/jalan-rungkut-madya-surabaya
curl -b jar.txt $B/me/boards

curl -b jar.txt -X PATCH -H "Content-Type: application/json" -d '{"dangerousTargetHours":24}' $B/boards/jalan-rungkut-madya-surabaya
curl -b jar.txt -X PATCH -H "Content-Type: application/json" -d '{"verification":"OFFICIAL"}' $B/boards/jalan-rungkut-madya-surabaya

curl -b jar.txt -H "Content-Type: application/json" -d '{"name":"Pedagang Liar"}' $B/boards/jalan-rungkut-madya-surabaya/categories
curl -b jar.txt -X PATCH -H "Content-Type: application/json" -d '{"name":"PKL Liar"}' $B/boards/jalan-rungkut-madya-surabaya/categories/ID
curl -b jar.txt -X PUT -H "Content-Type: application/json" -d '{"categoryIds":[ID1,ID2,...]}' $B/boards/jalan-rungkut-madya-surabaya/categories/order
curl -b jar.txt -X DELETE $B/boards/jalan-rungkut-madya-surabaya/categories/ID

curl -c jar2.txt -b jar2.txt -H "Content-Type: application/json" -d '{"email":"siti@tindak.test","password":"tindak123"}' $B/auth/login
curl -b jar2.txt -H "Content-Type: application/json" -d '{"name":"Taman Bungkul","city":"Kota Surabaya","type":"PUBLIC_FACILITY","description":"Laporan fasilitas di Taman Bungkul Surabaya."}' $B/boards
```

Ganti `ID` dengan id kategori dari respons detail Board. Hasil yang diharapkan:

- Login 200, cities 1 kota, search menampilkan SMKN 1 Surabaya (Official) paling atas.
- PATCH `dangerousTargetHours` 200. PATCH `verification` 400 dengan detail "Field ini tidak boleh dikirim".
- Board baru Siti 201 dengan slug `taman-bungkul-surabaya`. Board berikutnya untuk Siti masih boleh (Siti punya 3), yang keempat 403.

Lewat browser (frontend 2B): masuk sebagai `budi@tindak.test`, buka "Board Saya", buka SMKN 1 Surabaya (ada badge Official), lalu Pengaturan untuk mengubah info dan kategori. Coba juga "Buat Board". Daftar laporan di halaman Board masih error "Endpoint ... tidak ditemukan" karena baru dibuat di Fase 4A.

Uji manual yang sudah dilakukan: login, search, `me/boards`, dan detail lewat proxy, serta halaman detail SMKN 1 Surabaya di Chrome dengan data dari backend.

## Akun Seed

Password semua akun: `tindak123`. Hanya untuk development.

| Email                    | Role        | Board                                                                      |
| ------------------------ | ----------- | -------------------------------------------------------------------------- |
| `admin@tindak.test`      | ADMIN       | -                                                                          |
| `boardadmin@tindak.test` | BOARD_ADMIN | Memverifikasi SMKN 1 Surabaya                                              |
| `budi@tindak.test`       | USER        | OWNER: SMKN 1 Surabaya (Official), Jalan Rungkut Madya, Alun-Alun Sidoarjo |
| `siti@tindak.test`       | USER        | OWNER: Kampus ITS Sukolilo, Perumahan Pondok Jati RW 05                    |

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 131 tes lolos (7 file), client 40 tes lolos.
  - `boards.test.js`: buat Board (Komunitas, OWNER, kategori bawaan per jenis, slug), `verification` ditolak 400, tamu 401, kota tidak valid 400, kategori tambahan duplikat 400, Board ke-4 403, slug bentrok `-2` dan `-3`, pencarian (awalan sebelum mengandung, OFFICIAL di atas, filter verification dan kota, FROZEN tersembunyi, pagination, validasi), Board mirip (kota sama, kata umum), detail (`viewer.role` OWNER, user lain, tamu; FROZEN 404 untuk publik, terlihat untuk ADMIN dan BOARD_ADMIN; 404), PATCH (slug tetap, bukan OWNER 403, tamu 401, `verification` dan `city` 400, field lain tidak berubah, body kosong 400), kategori (tambah, duplikat 409, batas 20, ganti nama dan urutan, "Lainnya" dilindungi, hapus sampai tersisa satu, kategori board lain 404, urutkan ulang, bukan OWNER 403), `me/boards` (OWNER dan HANDLER aktif, undangan tidak ikut), kota.
  - `boards.unit.test.js`: `slugify`, awalan kota, akhiran slug, peringkat nama, urutan pencarian, kata Board mirip.
  - `auth.test.js`, `google.test.js`, `unit.test.js`: role dari `BOARD_ADMIN_EMAILS` saat daftar, login, dan Google; ADMIN didahulukan; ADMIN tidak diturunkan; `requireBoardAdmin` menolak USER dan ADMIN.
- `npm run build`: lolos.

## Keputusan dan Alasan

- **Daftar kota** dari dataset `cahyadsn/wilayah` (https://github.com/cahyadsn/wilayah), yang mengikuti Kepmendagri No 300.2.2-2138 Tahun 2025 (38 provinsi, 514 kabupaten/kota, lisensi MIT). Disimpan statis karena jarang berubah. Nama resmi dipakai karena banyak daerah punya versi Kota dan Kabupaten.
- **Skema form frontend tidak diubah perilakunya.** Server memakai skema request terpisah (`createBoardRequestSchema` dan lainnya) yang ketat dan memvalidasi kota, supaya form dan tes frontend 2B tetap jalan.
- **Pencarian diurutkan di JavaScript** setelah filter di database, karena urutan "sama persis / diawali / mengandung" sulit dibuat dengan Prisma. Cukup untuk skala lomba (ratusan Board). Jika Board mencapai puluhan ribu, ganti dengan query SQL mentah atau full-text index.
- **Board mirip** membuang kata umum (jalan, sekolah, smk, perumahan, rt, rw, dan lainnya) selama masih ada kata lain, lalu mencari Board di kota sama yang memuat salah satu kata.
- **Batas 3 Board** dihitung dari `Board.ownerId`, sehingga ikut berpindah saat kepemilikan dialihkan di Fase 3.
- **Kategori "Lainnya" dilindungi** dari ganti nama dan hapus (sesuai `docs/API.md`). Akibatnya Board selalu punya minimal satu kategori, sehingga tidak perlu pengecekan "kategori terakhir" terpisah.
- **Aksi pengelolaan Board dan kategori memperbarui `lastHandlerActivityAt`**, sebagai persiapan label Tidak Aktif.
- **Role**: `ADMIN` tidak pernah diturunkan otomatis. Role `BOARD_ADMIN` dari daftar email bisa naik menjadi ADMIN jika email masuk `ADMIN_EMAILS`.
- **Fungsi `promoteToAdmin` diganti `promoteUser(email, role)`** agar dipakai dua script. Tes lama disesuaikan namanya saja.

## Hal yang Belum Selesai

- `viewer` di hasil pencarian, `followerCount`, dan `viewer.isFollowing` diisi di Fase 3A.
- `activeReportCount` dan penolakan hapus kategori yang sudah dipakai laporan (diarsipkan, bukan dihapus) di Fase 4A.
- `trustScore`, rating, dan endpoint verifikasi Official di Fase 8.
- Foto sampul (`coverImageUrl`) menunggu upload di Fase 4.
- Daftar laporan di halaman Board (frontend 4B) masih 404 sampai Fase 4A.
- Build client memberi peringatan bundle di atas 500 KB (sudah ada sebelum fase ini). `cities.js` menambah sekitar 30 KB.

## Catatan untuk Fase Berikutnya

- **3A**: pakai `requireBoardRole('OWNER')` untuk kelola Penindak dan alih kepemilikan. Saat mengalihkan kepemilikan, ubah `Board.ownerId` dan role di `BoardMember` dalam satu transaksi. Isi `viewer` dan `followerCount` di `boards.presenter.js`.
- **4A**: `requireBoardRole('OWNER', 'HANDLER')` untuk antrean. Tambahkan pengecekan kategori dipakai laporan di `deleteCategory`. Isi `activeReportCount`.
- **8**: sisipkan `trustScore` di `compareSearchResults` setelah langkah OFFICIAL, dan pakai `requireBoardAdmin` untuk endpoint verifikasi.
- Tabel baru di tes: tambahkan ke `resetDatabase()` di `server/tests/helpers/db.js` sebelum `board.deleteMany()`.
