# Laporan Fase 3A: Ikuti Board dan Kelola Penindak (Backend)

- Branch: `feat/f3a-follow-handler`
- Pemilik: Oscar
- Tanggal: 2026-10-06
- PR: ke `dev`

## Ringkasan

Backend untuk mengikuti Board, mengelola Penindak, undangan, dan alih kepemilikan selesai, mengikuti kontrak Fase 3 yang ditulis frontend 3B. Detail dan kartu Board sekarang berisi `followerCount` asli dan objek `viewer` untuk user login. Alih kepemilikan tidak mengubah status Official, dan sudah memanggil fungsi audit serta notifikasi `BOARD_OWNER_CHANGED` untuk Admin Board. Frontend tidak diubah.

## Yang Dikerjakan

- Model `BoardFollower` dan enum `FollowNotifyLevel`.
- Ikuti, berhenti mengikuti, dan ubah notifikasi. Aman diulang. Penindak tidak bisa mengikuti Board yang dikelolanya.
- Undang Penindak lewat email (maks 10 termasuk undangan), daftar anggota, cabut Penindak atau batalkan undangan, dan larangan mencabut diri sendiri.
- Undangan masuk: daftar, terima (otomatis berhenti mengikuti Board itu), dan tolak (undangan dihapus).
- Alih kepemilikan dalam satu transaksi: peran OWNER dan HANDLER ditukar, `Board.ownerId` pindah, dan `verification` serta `verifiedAt` tetap.
- `decorateCards(boards, user)`: mengisi `followerCount` dan `viewer` untuk banyak Board sekaligus (3 query), dipakai di pencarian, Board mirip, `me/boards`, `me/follows`, dan `me/invitations`.
- Fungsi `recordAudit` dan `notifyBoardAdmins` sebagai pengganti TODO.
- Seed: Siti menjadi Penindak di SMKN 1 Surabaya, Budi diundang ke Perumahan Pondok Jati RW 05, dan 5 contoh pengikut.

## Pengganti TODO Audit dan Notifikasi

Prompt meminta TODO di service. Karena aturan tim "kode tanpa komentar", TODO diganti fungsi yang sudah dipanggil di tempat yang tepat:

| Fungsi                             | File                                                        | Sekarang                             | Diganti di                                      |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| `recordAudit(action, details)`     | `server/src/lib/audit.js`                                   | Menulis ke log server (`Audit: ...`) | Fase 7: simpan ke tabel audit log               |
| `notifyBoardAdmins(type, payload)` | `server/src/modules/notifications/notifications.service.js` | Menulis ke log server                | Fase 9: kirim notifikasi ke semua `BOARD_ADMIN` |

Aksi yang dicatat audit:

| Aksi                         | Kapan                         | Data                                                              |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `BOARD_HANDLER_INVITED`      | OWNER mengundang              | boardId, actorId, targetUserId                                    |
| `BOARD_INVITATION_CANCELLED` | OWNER membatalkan undangan    | boardId, actorId, targetUserId                                    |
| `BOARD_HANDLER_REMOVED`      | OWNER mencabut Penindak aktif | boardId, actorId, targetUserId                                    |
| `BOARD_INVITATION_ACCEPTED`  | Penerima menerima             | boardId, actorId                                                  |
| `BOARD_INVITATION_DECLINED`  | Penerima menolak              | boardId, actorId                                                  |
| `BOARD_OWNER_CHANGED`        | Alih kepemilikan              | boardId, slug, verification, previousOwnerId, newOwnerId, actorId |

Notifikasi `BOARD_OWNER_CHANGED` (konstanta di `shared`, `NOTIFICATION_TYPES`) dikirim ke audiens `BOARD_ADMIN` dengan data yang sama, supaya Admin Board tahu pemilik Board Official berganti.

## File Penting

| File                                                        | Keterangan                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `server/prisma/schema.prisma`                               | Model `BoardFollower`, enum `FollowNotifyLevel`                  |
| `server/src/modules/follows/follows.service.js`             | Ikuti, berhenti, notifikasi, `listMyFollows`                     |
| `server/src/modules/members/members.service.js`             | Undang, daftar, cabut, undangan, alih kepemilikan                |
| `server/src/modules/boards/boards.service.js`               | `decorateCards`, detail berisi pengikut dan `viewer`             |
| `server/src/modules/boards/boards.presenter.js`             | `toViewer`, `toBoardCard` dengan `followerCount` dan `viewer`    |
| `server/src/modules/boards/boards.routes.js`                | Route follow, handlers, transfer, `me/follows`, `me/invitations` |
| `server/src/lib/audit.js`                                   | `recordAudit`                                                    |
| `server/src/modules/notifications/notifications.service.js` | `notifyBoardAdmins`                                              |
| `shared/src/schemas/handlers.js`                            | Skema request ketat untuk follow, undang, transfer               |
| `shared/src/constants/notifications.js`                     | `NOTIFICATION_TYPES`                                             |

## Perubahan Database

Migrasi `20261006020508_add_board_followers`: tabel `board_followers` (unik `board_id` + `user_id`, index `user_id` + `created_at`, dan ikut terhapus jika Board atau user dihapus) serta enum `FollowNotifyLevel`.

## Endpoint Baru

| Method | Path                                 | Auth           | Keterangan                |
| ------ | ------------------------------------ | -------------- | ------------------------- |
| POST   | `/api/boards/:slug/follow`           | Login          | Ikuti (idempoten)         |
| DELETE | `/api/boards/:slug/follow`           | Login          | Berhenti (idempoten), 204 |
| PATCH  | `/api/boards/:slug/follow`           | Login          | Ubah `notifyLevel`        |
| GET    | `/api/me/follows`                    | Login          | Board yang diikuti        |
| GET    | `/api/boards/:slug/handlers`         | OWNER, HANDLER | Anggota HANDLER           |
| POST   | `/api/boards/:slug/handlers`         | OWNER          | Undang lewat email        |
| DELETE | `/api/boards/:slug/handlers/:userId` | OWNER          | Cabut atau batalkan, 204  |
| POST   | `/api/boards/:slug/transfer`         | OWNER          | Alih kepemilikan          |
| GET    | `/api/me/invitations`                | Login          | Undangan menunggu         |
| POST   | `/api/me/invitations/:id/accept`     | Penerima       | Terima                    |
| POST   | `/api/me/invitations/:id/decline`    | Penerima       | Tolak, 204                |

Kontrak tetap seperti yang ditulis 3B. Penjelasan yang ditambahkan ke `docs/API.md`: daftar anggota tidak memuat OWNER, menerima undangan menghapus status mengikuti, field asing ditolak, rate limit undangan, respons transfer dari sudut pandang pemilik lama, dan Board FROZEN disembunyikan dari `me/follows` dan `me/invitations`.

## Cara Menguji Manual

```bash
git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Lewat browser (frontend 3B sudah ada), password semua akun `tindak123`:

1. Masuk sebagai `budi@tindak.test`. Sidebar kiri menampilkan "Board Diikuti: Kampus ITS Sukolilo".
2. Buka **Undangan** (`/undangan`). Ada undangan dari Perumahan Pondok Jati RW 05. Klik **Terima**, lalu Board itu muncul di **Board Saya** sebagai Penindak.
3. Buka halaman Board milik orang lain, misalnya Kampus ITS Sukolilo. Klik **Ikuti** atau **Berhenti mengikuti**, dan ubah notifikasi lewat dropdown. Jumlah pengikut berubah.
4. Buka SMKN 1 Surabaya → **Pengaturan** → bagian **Penindak**. Siti tampil sebagai Aktif. Coba undang `boardadmin@tindak.test`, lalu batalkan undangannya.
5. Alihkan kepemilikan SMKN 1 Surabaya ke Siti (ketik nama Board untuk konfirmasi). Badge Official tetap ada. Di terminal server muncul log `Audit: BOARD_OWNER_CHANGED` dan `Notifikasi BOARD_OWNER_CHANGED untuk Admin Board`.
6. Masuk sebagai `siti@tindak.test` untuk memastikan Siti sekarang Penindak Utama SMKN 1 Surabaya.

Jalankan `npm run db:seed` lagi kapan saja. Data yang sudah diubah lewat langkah di atas tidak dikembalikan, tetapi yang belum ada akan dibuat lagi.

Contoh curl (Git Bash, lewat proxy):

```bash
B=http://localhost:5173/api
curl -c jar.txt -b jar.txt -H "Content-Type: application/json" -d '{"email":"budi@tindak.test","password":"tindak123"}' $B/auth/login
curl -b jar.txt -X POST $B/boards/jalan-rungkut-madya-surabaya/follow
curl -b jar.txt -X POST $B/boards/kampus-its-sukolilo-surabaya/follow
curl -b jar.txt -X PATCH -H "Content-Type: application/json" -d '{"notifyLevel":"DANGEROUS_ONLY"}' $B/boards/kampus-its-sukolilo-surabaya/follow
curl -b jar.txt -X DELETE $B/boards/kampus-its-sukolilo-surabaya/follow
curl -b jar.txt $B/me/follows
curl -b jar.txt $B/me/invitations
curl -b jar.txt -X POST $B/me/invitations/ID/accept
curl -b jar.txt $B/boards/smkn-1-surabaya-surabaya/handlers
curl -b jar.txt -H "Content-Type: application/json" -d '{"email":"boardadmin@tindak.test"}' $B/boards/smkn-1-surabaya-surabaya/handlers
curl -b jar.txt -X DELETE $B/boards/smkn-1-surabaya-surabaya/handlers/USER_ID
curl -b jar.txt -H "Content-Type: application/json" -d '{"userId":SITI_ID}' $B/boards/smkn-1-surabaya-surabaya/transfer
```

Follow pertama ke Jalan Rungkut Madya membalas 403, karena Budi adalah pemiliknya. Ganti `ID`, `USER_ID`, dan `SITI_ID` dengan angka dari respons sebelumnya.

Uji manual yang sudah dilakukan: endpoint undangan, follows, detail, dan handlers lewat proxy, serta halaman `/undangan` dan sidebar Board Diikuti di Chrome sebagai Budi.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 151 tes lolos (8 file), client 40 tes lolos.
  - `follows-members.test.js` (20 tes): follow dan unfollow idempoten, `followerCount` dan `viewer` di detail dan pencarian (login dan tamu), `notifyLevel` tetap saat follow diulang, ubah notifikasi (belum mengikuti 404, nilai salah 400), tamu 401, OWNER dan HANDLER tidak bisa mengikuti 403, Board tidak ada 404, urutan `me/follows`; undang (sukses, email belum terdaftar 404, anggota sudah ada 409, diri sendiri 409, field asing 400, batas 10), daftar anggota (OWNER dan HANDLER boleh, user lain 403, tamu 401), HANDLER tidak bisa undang, cabut, atau transfer, cabut aktif dan batalkan undangan, cabut diri sendiri 403; undangan (daftar, terima, berhenti mengikuti, terima ulang 409, tolak, milik orang lain 404); transfer (peran tertukar, `ownerId` pindah, verification dan `verifiedAt` tetap, notifikasi dipanggil, hak edit pindah), penerima bukan HANDLER ACTIVE 404, penerima punya 3 Board 409, field `verification` 400.
- `npm run build`: lolos.

## Keputusan dan Alasan

- **Daftar anggota hanya berisi HANDLER.** UI 3B menampilkan tombol "Cabut" untuk setiap baris, jadi OWNER tidak dimasukkan. Data OWNER sudah ada di `owner` pada detail Board.
- **Menerima undangan menghapus status mengikuti**, sesuai aturan kontrak bahwa Penindak tidak mengikuti Board yang dikelolanya.
- **Batas 10 Penindak** menghitung HANDLER aktif dan yang masih diundang, tanpa OWNER.
- **Batas 3 Board saat transfer membalas 409** (kontrak Fase 3), berbeda dari 403 saat membuat Board (kontrak Fase 2). Keduanya mengikuti `docs/API.md`.
- **Undangan dan alih kepemilikan memakai transaksi**, supaya dua permintaan bersamaan tidak membuat dua OWNER atau melewati batas.
- **Endpoint undang diberi rate limit** 30 per jam, karena respons `USER_NOT_FOUND` bisa dipakai menebak email terdaftar.

## Hal yang Belum Selesai

- Tabel audit log (Fase 7) dan pengiriman notifikasi sungguhan, termasuk notifikasi undangan untuk user (Fase 9).
- HANDLER belum bisa keluar sendiri dari Board. Belum ada di kontrak, perlu diputuskan.
- Batas pengikut, rate limit follow, dan pembersihan pengikut saat Board dibekukan belum ada.

## Catatan untuk Fase Berikutnya

- **4A**: Penindak yang boleh menangani laporan memakai `requireBoardRole('OWNER', 'HANDLER')`. Notifikasi laporan baru ke pengikut membaca `BoardFollower.notifyLevel` (`ALL`, `DANGEROUS_ONLY`, `OFF`).
- **7**: ganti isi `recordAudit` agar menyimpan ke tabel. Semua pemanggilnya tidak perlu diubah.
- **9**: ganti isi `notifyBoardAdmins`, dan tambahkan notifikasi undangan di `inviteHandler`.
- Kartu Board baru di endpoint lain: pakai `decorateCards(boards, req.user)` agar `followerCount` dan `viewer` selalu konsisten.
