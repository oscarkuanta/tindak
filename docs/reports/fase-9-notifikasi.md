# Laporan Fase 9: Notifikasi dan Realtime

- Branch: `feat/f9-notifications`
- Pemilik: Oscar (fullstack, bagian A dan B dalam satu branch)
- Tanggal: 2026-10-06
- PR: dicatat di commit fase berikutnya

## Ringkasan

Fase ini menambahkan notifikasi dalam aplikasi (lonceng, halaman notifikasi, toast) untuk semua kejadian di PRODUCT.md, termasuk alur verifikasi Board, dan pembaruan realtime dengan Socket.IO: laporan baru muncul di antrean Penindak, status dan jumlah dukungan berubah di halaman pelapor, dan badge Official berubah tanpa refresh. Server juga disiapkan agar bisa di-deploy sebagai satu service dengan satu alamat.

## Yang Dikerjakan

Backend:

- Model `Notification` dan kolom `Report.dueWarningSentAt`.
- `notify.service.js` berisi pengirim notifikasi dan event realtime, dipanggil dari service (laporan, penindakan, dukungan, moderasi, anggota Board, kepercayaan, verifikasi). Pelaku aksi tidak pernah menerima notifikasinya sendiri; satu orang paling banyak satu notifikasi per kejadian.
- 20 jenis notifikasi (tabel lengkap di API.md Fase 9), termasuk BOARD_VERIFIED, BOARD_VERIFICATION_REVOKED (dengan alasan), BOARD_CANDIDATE_NEW, BOARD_OWNER_CHANGED (hanya Board Official), serta dua jenis dari PRODUCT.md yang tidak ada di prompt: ringkasan rating harian dan Board Official masuk Perlu Ditinjau Ulang.
- Fungsi notifikasi kosong dari Fase 3 dan Fase 8 diisi.
- Endpoint daftar, jumlah belum dibaca, tandai dibaca, dan tandai semua.
- Socket.IO di server yang sama: autentikasi memakai cookie session, room `user:<id>`, `board:<slug>`, `report:<id>` dengan cek hak akses, event `notification:new`, `report:updated`, `report:created`, `queue:updated`, `board:updated`.
- Job per jam untuk peringatan Berbahaya 6 jam sebelum batas waktu dan job harian untuk ringkasan rating.
- Mode satu link: dengan `NODE_ENV=production`, Express menyajikan `client/dist` beserta `/api`, `/socket.io`, dan `/uploads` dari alamat yang sama. Content Security Policy disesuaikan untuk Cloudflare Turnstile. Script root `npm start` ditambahkan.

Frontend:

- Lonceng di header dengan badge jumlah belum dibaca, dropdown 10 notifikasi terbaru (ikon per jenis termasuk ✔️ ⛔ 🏅 🔑 untuk verifikasi, waktu relatif, klik menuju tujuan dan menandai dibaca, tombol Tandai semua dibaca).
- Halaman `/notifikasi` dengan paging dan filter belum dibaca.
- `RealtimeProvider`: socket tersambung untuk semua pengunjung dan tersambung ulang saat login atau logout, sehingga room user mengikuti akun yang aktif. Event memperbarui cache TanStack Query: jumlah dukungan dan status di kartu dan detail, antrean dan kanban Penindak, badge lonceng, dan badge Official di halaman Board. Toast singkat untuk notifikasi baru.
- Halaman Board, antrean, detail laporan, dan Lacak otomatis berlangganan room yang sesuai.
- Proxy Vite untuk `/socket.io`.

## File Penting

| File                                                           | Keterangan                                    |
| -------------------------------------------------------------- | --------------------------------------------- |
| `shared/src/constants/notifications.js`                        | Jenis, ikon, nama event, `notificationLink`   |
| `server/src/modules/notifications/notify.service.js`           | Pengirim notifikasi dan event realtime        |
| `server/src/modules/notifications/notifications.service.js`    | Endpoint dan notifikasi verifikasi Board      |
| `server/src/modules/realtime/socket.js`, `realtime.service.js` | Server Socket.IO dan cek hak room             |
| `server/src/lib/realtime.js`                                   | Helper room dan emit                          |
| `server/src/lib/clientApp.js`                                  | Menyajikan frontend untuk deploy satu link    |
| `client/src/features/realtime/*`                               | Provider socket, langganan room, update cache |
| `client/src/components/notifications/*`                        | Lonceng dan item notifikasi                   |
| `client/src/pages/notifications/NotificationsPage.jsx`         | Halaman notifikasi                            |

## Perubahan Database

- `add_notifications`: tabel `notifications` (index `user_id + read_at` dan `user_id + created_at`) dan kolom `reports.due_warning_sent_at`.

## Endpoint Baru

| Method | Path                              | Auth     | Keterangan          |
| ------ | --------------------------------- | -------- | ------------------- |
| GET    | `/api/notifications`              | Login    | Daftar notifikasi   |
| GET    | `/api/notifications/unread-count` | Login    | Jumlah belum dibaca |
| POST   | `/api/notifications/:id/read`     | Login    | Tandai dibaca       |
| POST   | `/api/notifications/read-all`     | Login    | Tandai semua dibaca |
| WS     | `/socket.io`                      | Opsional | Realtime            |

Perubahan kontrak di `docs/API.md`: bagian Fase 9 baru; catatan alih kepemilikan Fase 3 dan kandidat Fase 8 diperbarui; `runScheduledJobs` menambah `dueWarnings`.

## Cara Menguji Manual

1. `npm install`, `npm run db:migrate`, lalu `npm run dev`.
2. Buka dua browser (misalnya Chrome biasa dan jendela Incognito).
3. Browser A: masuk sebagai `budi@tindak.test` (password `tindak123`), buka Board Jalan Rungkut Madya, lalu Antrean Laporan.
4. Browser B (tamu): buat laporan di Jalan Rungkut Madya. Kartu baru langsung muncul di kanban browser A, dan lonceng Budi bertambah.
5. Browser B: buka halaman Lacak laporan tadi. Browser A: klik Proses. Status di browser B berubah tanpa refresh.
6. Masuk sebagai `boardadmin@tindak.test` di browser B dan jadikan Board Official, sementara browser A membuka halaman Board itu: badge Official muncul tanpa refresh, dan Penindak Utama mendapat notifikasi.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 386 tes lolos (19 file), client 80 tes lolos (22 file).
- `npm run build -w client`: berhasil.

## Keputusan dan Alasan

- Library baru `socket.io` (server) dan `socket.io-client` (client): diminta prompt fase dan PRODUCT.md untuk realtime. Socket.IO otomatis jatuh ke HTTP long-polling jika WebSocket diblokir jaringan.
- Socket tersambung juga untuk tamu, agar halaman Lacak dan halaman Board tetap realtime. Koneksi diputus dan dibuat ulang setiap kali login atau logout.
- Event realtime dipancarkan setelah transaksi selesai. Kegagalan mengirim notifikasi dicatat di log dan tidak menggagalkan aksi utama.
- Payload `report:updated` hanya berisi data publik (status dan jumlah). Klien memperbarui daftar langsung dari payload dan memuat ulang detail laporan agar timeline ikut terbaru.
- Deploy satu link: hosting serverless seperti Vercel tidak cocok karena Socket.IO, job terjadwal, dan folder upload butuh proses yang terus berjalan. Server Express menyajikan frontend sendiri sehingga cukup satu service dan satu alamat, tanpa pengaturan CORS dan cookie lintas domain.
- Dua tes lama diperbarui karena perilakunya memang berubah: tes alih kepemilikan Fase 3 sekarang memeriksa notifikasi tersimpan untuk Admin Board (sebelumnya memeriksa log stub), dan tes `runScheduledJobs` Fase 5 menyertakan `dueWarnings`.

## Hal yang Belum Selesai

- Notifikasi belum dikirim lewat email atau push browser; hanya dalam aplikasi.
- Tidak ada pembersihan otomatis notifikasi lama.

## Catatan untuk Fase Berikutnya

- Fase 10: jumlah dan jenis notifikasi bisa dipakai di dashboard jika perlu.
- Fase 11: deploy cukup satu service (`npm run build`, `npm run db:deploy`, `npm start` dengan `NODE_ENV=production`), isi `CLIENT_URL` dengan alamat situs itu sendiri, pakai hosting yang servernya selalu menyala dan sediakan penyimpanan permanen untuk `UPLOAD_DIR`. Jika suatu saat server dijalankan lebih dari satu instance, Socket.IO butuh adapter (misalnya Redis).
