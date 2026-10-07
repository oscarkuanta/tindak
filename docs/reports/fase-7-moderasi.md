# Laporan Fase 7: Moderasi dan Panel Admin

- Branch: `feat/f7-moderation`
- Pemilik: Oscar (fullstack, bagian A dan B dalam satu branch)
- Tanggal: 2026-10-06
- PR: [#24](https://github.com/oscarkuanta/tindak/pull/24)

## Ringkasan

Fase ini menambahkan moderasi konten: user bisa Tandai Pelanggaran pada laporan dan Board, laporan disembunyikan otomatis jika tanda cukup, dan Admin punya Panel Admin untuk meninjau antrean, memulihkan atau menghapus laporan, mem-ban akun, perangkat, atau IP, membekukan Board, dan melihat audit log. Membekukan Board Official ikut mencabut status Official. Bagian A dan B dikerjakan sekaligus atas permintaan pemilik proyek.

## Yang Dikerjakan

Backend:

- Model `Flag`, `Ban`, `AuditLog`, kolom moderasi di `Report` dan `Board`.
- `POST /api/flags` dengan bobot tanda, batas 20 per hari, satu tanda per target per user, dan tiga aturan sembunyi otomatis.
- Laporan dengan foto buram otomatis masuk antrean lewat tanda sistem `SYSTEM_NSFW` (bobot 0), termasuk laporan lama lewat migrasi backfill.
- Ban akun, perangkat tamu, dan IP. Ban dicek saat login email dan Google, membuat laporan, Dukung, reaksi, membuat Board, dan Tandai Pelanggaran. Pesan error menyebut sisa waktu ban.
- Panel Admin `/api/admin/*` hanya untuk role `ADMIN` (`BOARD_ADMIN` ditolak): statistik, antrean, pulihkan, hapus (+ban), daftar dan cabut ban, kelola Board (bekukan, cairkan, abaikan tanda), kelola user, audit log.
- Bekukan Board Official mengubah ke Komunitas dalam transaksi yang sama dan mencatat `BOARD_VERIFICATION_REVOKED_BY_FREEZE`. Mencairkan tidak mengembalikan Official.
- Audit log di database untuk aksi moderasi, aksi Penindak, konfirmasi laporan, dan aksi anggota Board.
- Job harian menghapus `ipHash` laporan yang lebih tua dari 90 hari, kecuali yang dipakai ban IP aktif.
- Laporan tersembunyi yang dibuka publik mengembalikan data ringkas "Laporan ini sedang ditinjau moderator", bukan 404.

Frontend:

- Menu "⋯" di kartu laporan, detail laporan, dan halaman Board dengan modal Tandai Pelanggaran (alasan dengan ikon; Board punya 🏚️ Board palsu). Tamu diminta masuk.
- Foto buram memakai komponen `BlurredImage` dengan tombol "Tampilkan foto" (kartu, detail, slider sebelum-sesudah).
- Kartu abu-abu untuk laporan tersembunyi, banner untuk pelapor dan Penindak, badge "Ditinjau moderator" di kartu.
- Panel Admin di `/admin` (Dashboard, Antrean Moderasi, Daftar Ban, Kelola Board, Kelola User, Audit Log). `/panel-admin` dialihkan ke `/admin`.
- Modal bekukan Board menampilkan peringatan "Status Official Board ini akan ikut dicabut." untuk Board Official.
- Statistik Board menampilkan "Laporan dipulihkan moderator" jika lebih dari 0.
- Pesan login Google untuk akun yang di-ban.

## File Penting

| File                                                    | Keterangan                                             |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `server/src/modules/moderation/flags.service.js`        | Tanda, bobot, aturan sembunyi otomatis                 |
| `server/src/modules/moderation/admin.service.js`        | Antrean, pulihkan, hapus, ban, Board, user, audit, job |
| `server/src/modules/moderation/moderation.routes.js`    | Router `/api/flags` dan `/api/admin`                   |
| `server/src/lib/bans.js`, `middlewares/rejectBanned.js` | Cek ban dan pesan sisa waktu                           |
| `server/src/lib/audit.js`                               | `recordAudit` menulis ke tabel `AuditLog`              |
| `shared/src/constants/moderation.js`                    | Alasan, ikon, ambang, durasi ban                       |
| `shared/src/schemas/moderation.js`                      | Skema Zod tanda, ban, hapus, bekukan, query admin      |
| `client/src/components/moderation/*`                    | FlagButton, FlagModal, BanFields, FreezeBoardModal     |
| `client/src/components/reports/BlurredImage.jsx`        | Foto buram dengan tombol Tampilkan foto                |
| `client/src/pages/admin/*`                              | Halaman Panel Admin                                    |
| `client/src/features/moderation/*`                      | API dan hooks TanStack Query                           |
| `server/tests/moderation.test.js`                       | 23 tes integrasi Fase 7                                |

## Perubahan Database

- `20261006080850_add_moderation`: enum `FlagTargetType`, `FlagReason`, `FlagStatus`, `BanTargetType`, `ReportHiddenReason`; tabel `flags` (unik `targetType + targetId + userId`), `bans`, `audit_logs`; `Report.ipHash` boleh null, `Report.hiddenReason`, `hiddenByHandler`, `removedAt`; `Board.restoredByAdminCount`.
- `20261006080902_add_moderation`: migrasi kosong yang tidak sengaja terbuat saat `migrate dev --create-only` dan sudah terpasang di database lokal. Dibiarkan agar database anggota tim tidak dianggap berbeda oleh Prisma. Tidak berpengaruh apa pun.
- `20261006080921_backfill_nsfw_flags`: membuat tanda `SYSTEM_NSFW` untuk laporan lama yang fotonya diburamkan.

## Endpoint Baru

| Method | Path                                    | Auth  | Keterangan                       |
| ------ | --------------------------------------- | ----- | -------------------------------- |
| POST   | `/api/flags`                            | Login | Tandai Pelanggaran               |
| GET    | `/api/admin/stats`                      | Admin | Statistik                        |
| GET    | `/api/admin/moderation`                 | Admin | Antrean dikelompokkan per target |
| POST   | `/api/admin/reports/:id/restore`        | Admin | Pulihkan laporan                 |
| POST   | `/api/admin/reports/:id/remove`         | Admin | Hapus laporan, opsional + ban    |
| GET    | `/api/admin/bans`                       | Admin | Daftar ban                       |
| POST   | `/api/admin/bans`                       | Admin | Buat ban                         |
| DELETE | `/api/admin/bans/:id`                   | Admin | Cabut ban                        |
| GET    | `/api/admin/boards`                     | Admin | Daftar Board dengan jumlah tanda |
| POST   | `/api/admin/boards/:slug/freeze`        | Admin | Bekukan Board                    |
| POST   | `/api/admin/boards/:slug/unfreeze`      | Admin | Cairkan Board                    |
| POST   | `/api/admin/boards/:slug/dismiss-flags` | Admin | Abaikan tanda Board              |
| GET    | `/api/admin/users`                      | Admin | Daftar user                      |
| GET    | `/api/admin/audit-logs`                 | Admin | Audit log dengan filter          |

Perubahan kontrak di `docs/API.md`: bagian Fase 7 baru; `ACCOUNT_BANNED` masuk tabel error umum; Catatan Ban Fase 1 diperbarui; error ban di `POST /api/boards/:slug/reports` sekarang `ACCOUNT_BANNED` (sebelumnya tertulis `FORBIDDEN`); `GET /api/reports/:id` untuk laporan tersembunyi kini `200` data ringkas, bukan `404`.

## Cara Menguji Manual

1. `npm run db:migrate`, lalu `npm run dev`.
2. Masuk sebagai `budi@tindak.test` (password `tindak123`), buka laporan, klik "⋯" lalu Tandai Pelanggaran, pilih Konten seksual. Ulangi dengan `siti@tindak.test`. Laporan berubah menjadi kartu abu-abu untuk tamu.
3. Masuk sebagai `admin@tindak.test`, buka menu akun lalu Panel Admin. Di Antrean Moderasi laporan tadi ada di paling atas.
4. Klik Hapus + Ban, pilih Akun atau Jaringan (IP) dan durasi. Lihat Daftar Ban, lalu Cabut Ban.
5. Ban akun `budi@tindak.test` dari Kelola User, lalu coba login sebagai Budi: muncul pesan diblokir dengan sisa waktu.
6. Di Kelola Board, bekukan Board Official: muncul peringatan pencabutan Official. Setelah dicairkan, Board tetap Komunitas.
7. Masuk sebagai `boardadmin@tindak.test`, buka `/admin`: muncul 403.

## Hasil Tes

- `npm run lint`: lolos, tanpa error dan peringatan.
- `npm test`: server 338 tes lolos (15 file), client 62 tes lolos (20 file).
- `npm run build -w client`: berhasil.

## Keputusan dan Alasan

- Hapus laporan adalah hapus lunak (`removedAt`) agar riwayat dan audit tetap ada dan bisa dipulihkan.
- Ban perangkat dan IP dibuat dari `reportId` sehingga Admin tidak pernah melihat hash mentah; tampilan memakai hash tersamar.
- Laporan tersembunyi tetap bisa dibuka lewat tautan dengan kartu ringkas, karena 404 membingungkan orang yang mengikuti tautan lama. Feed tetap tidak menampilkannya.
- Endpoint tambahan `dismiss-flags` agar tanda Board yang keliru bisa ditolak (dan menambah hitungan penyalahguna) tanpa membekukan Board.
- Riwayat verifikasi Board (Fase 8) belum ada, jadi pencabutan Official karena pembekuan dicatat di `AuditLog` dengan tanggal dan pemberi verifikasi sebelumnya.
- `requireAdmin` hanya menerima `ADMIN`; Admin tidak punya endpoint untuk mengubah verification.

## Hal yang Belum Selesai

- Seed demo belum berisi tanda atau ban, jadi antrean kosong sampai ada yang menandai.
- Migrasi kosong `20261006080902_add_moderation` (lihat Perubahan Database).

## Catatan untuk Fase Berikutnya

- Fase 8: saat membuat tabel riwayat verifikasi, tambahkan entri "dicabut karena pembekuan" di `freezeBoard` (`admin.service.js`). `openFakeBoardFlagCount(boardId)` di `flags.service.js` siap dipakai sebagai sinyal kepercayaan, begitu pula `Board.restoredByAdminCount`.
- Fase 9: aksi moderasi sudah tercatat di `AuditLog` dan bisa dipakai sebagai sumber notifikasi.
- Tampilan Panel Admin sengaja sederhana dan memakai komponen `components/ui` serta design token, sehingga mudah diganti oleh tim UI.
