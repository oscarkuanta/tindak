# Laporan Fase 13: Perbaikan UI

- Branch: `feat/f13-perbaikan-ui`
- Pemilik: Oscar
- Tanggal: 2026-10-08
- PR: (diisi setelah PR dibuat)

## Ringkasan

Fase ini memperbaiki tampilan yang masih terasa "buatan AI": semua emoji diganti ikon Phosphor, warna dibuat lebih kontras dan berwarna, reaksi tampil sebagai bulatan berwarna, tombol Dukung punya animasi, data demo memakai foto asli dan banner Board, centang Official bergaya Instagram, panel kiri menampilkan menu sesuai role, dan istilah bekukan/cairkan diganti Freeze/Unfreeze dengan durasi dan unfreeze otomatis. Atas permintaan pemilik proyek, perubahan backend kecil (durasi freeze, larangan menandai Board sendiri) dan frontend dikerjakan dalam satu fase dan satu PR.

## Yang Dikerjakan

- Semua emoji di UI, konstanta `shared`, dan nama tes diganti ikon `@phosphor-icons/react`. `lucide-react` dihapus dari dependensi.
- Komponen ikon bersama `client/src/components/icons/AppIcons.jsx`: `ReactionIcon`, `SeverityIcon`, `FlagReasonIcon`, `QuickTagIcon`, `BoardTypeIcon`, `NotificationIcon`, `StarIcon`.
- Reaksi Berbahaya, Sudah Lama, dan Mengganggu tampil langsung sebagai tiga tombol bulat berwarna (merah, oranye, ungu). Warnanya penuh saat aktif atau sudah ada yang bereaksi.
- Tombol Dukung: ikon panah melompat, angka membesar sebentar, dan muncul "+1" yang melayang.
- Warna status dan tingkat bahaya lebih kontras (chip dengan titik warna). Tingkat bahaya di form laporan berupa tiga kartu berikon (Rendah, Sedang, Berbahaya).
- Kartu ringkasan (Beranda, Statistik Board, Dashboard Verifikasi, Panel Admin) memakai ikon berwarna sesuai arti, misalnya Berbahaya merah dengan tanda seru.
- Panel Admin: kartu "Perlu ditangani" bisa diklik dan membuka menu terkait. Kartu "Ringkasan platform" hanya informasi dan diletakkan di bawah.
- Centang Official bergaya Instagram (`SealCheck` biru). Tombol "Jadikan Official" bergradasi biru dengan centang. Tombol Lewati dan Cabut diberi ikon.
- Header: tombol "Laporkan Masalah" (ikon megafon) dan "Buat Board" (ikon plus). Tombol Ikuti/Diikuti dan Laporkan Masalah di halaman Board diberi ikon.
- Panel kiri: bagian Akun (Laporan Saya, Notifikasi, Undangan Penindak dengan jumlah undangan) dan bagian Staf (Verifikasi Board untuk Admin Board, Panel Admin untuk Admin).
- Freeze/Unfreeze: Admin memilih durasi 7 hari, 30 hari, atau permanen. Board aktif lagi otomatis lewat job terjadwal saat waktunya habis. Daftar Kelola Board menampilkan kapan Board aktif lagi. Filter status bisa dibuka lewat `?status=FROZEN` dari kartu dashboard.
- Penindak Utama dan Penindak tidak bisa menandai Board yang dikelolanya sendiri (403). Mereka tetap boleh melapor, mendukung, dan bereaksi seperti warga. Admin dan Admin Board juga tetap boleh melapor dan diundang menjadi Penindak.
- Favicon baru: kotak hijau mint dengan logo T! putih dan dua garis kuning, sesuai logo.
- Data demo: ilustrasi diganti foto asli bebas pakai dari Wikimedia Commons (diperkecil, tanpa metadata), plus banner untuk 8 Board demo.
- Perbaikan tampilan HP: avatar Board tidak lagi tertutup banner.
- Screenshot README di `docs/screenshots` diambil ulang.

## File Penting

| File                                                       | Keterangan                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `client/src/components/icons/AppIcons.jsx`                 | Kumpulan ikon dan pemetaan warna                                                                              |
| `client/src/index.css`                                     | Token warna baru, chip status, kartu tingkat bahaya, reaksi, animasi Dukung, kartu statistik, tombol Official |
| `client/src/components/reports/EngagementBar.jsx`          | Tombol Dukung beranimasi dan reaksi bulat berwarna                                                            |
| `client/src/components/reports/SeveritySelector.jsx`       | Kartu pilihan tingkat bahaya berikon                                                                          |
| `client/src/components/ui/StatCard.jsx`                    | Kartu statistik berwarna, bisa berupa link                                                                    |
| `client/src/pages/admin/AdminDashboardPage.jsx`            | Kartu yang bisa diklik dipisah dari kartu informasi                                                           |
| `client/src/components/moderation/FreezeBoardModal.jsx`    | Modal Freeze dengan pilihan durasi                                                                            |
| `client/src/pages/admin/AdminBoardsPage.jsx`               | Tombol Freeze/Unfreeze, info waktu aktif lagi, filter dari URL                                                |
| `client/src/app/layouts/LeftNav.jsx`                       | Menu per role                                                                                                 |
| `client/public/favicon.svg`                                | Favicon sesuai logo                                                                                           |
| `server/src/modules/moderation/admin.service.js`           | `freezeBoard` dengan durasi, `unfreezeExpiredBoards`                                                          |
| `server/src/jobs/index.js`                                 | Job unfreeze otomatis                                                                                         |
| `server/src/modules/moderation/flags.service.js`           | Larangan menandai Board sendiri                                                                               |
| `server/prisma/seed-demo.js`, `server/prisma/demo-photos/` | Foto asli dan banner Board demo                                                                               |

## Perubahan Database

Migrasi `20261008032106_add_board_frozen_until`: kolom `Board.frozenUntil` (`frozen_until`, DATETIME, nullable). Hanya menambah kolom, data lama aman. Board yang sudah di-freeze sebelum migrasi punya `frozenUntil` null sehingga dianggap permanen.

## Endpoint Baru

Tidak ada endpoint baru. Perubahan kontrak di `docs/API.md`:

| Method | Path                             | Auth  | Keterangan                                                                       |
| ------ | -------------------------------- | ----- | -------------------------------------------------------------------------------- |
| POST   | `/api/admin/boards/:slug/freeze` | Admin | Body wajib `duration` (`7d`, `30d`, `permanent`). Respons menambah `frozenUntil` |
| GET    | `/api/admin/boards`              | Admin | Setiap item menambah `frozenUntil`                                               |
| POST   | `/api/flags`                     | Login | `403 FORBIDDEN` jika Penindak menandai Board yang dikelolanya sendiri            |

`runScheduledJobs` menambah `unfrozenBoards`. Teks "dibekukan/dicairkan" di dokumen diganti "di-freeze/di-unfreeze".

## Cara Menguji Manual

1. `npm install`, lalu `npm run db:migrate -w server`.
2. Isi data demo di database terpisah (jangan database utama): lihat `docs/DEMO.md`, jalankan `npm run db:seed:demo -- --reset`.
3. Masuk sebagai `siti@demo.test`. Beranda: kartu ringkasan berwarna, foto laporan asli, tidak ada emoji. Buka laporan, klik Dukung: ikon melompat dan muncul "+1". Klik reaksi: bulatan berwarna.
4. Buka Board Jalan Ahmad Yani: banner foto, centang Official biru. Buka Laporkan Masalah: tiga kartu tingkat bahaya berikon.
5. Masuk sebagai `admin@demo.test`. Panel kiri ada "Panel Admin". Dashboard: kartu atas bisa diklik, kartu bawah hanya info. Kelola Board: klik Freeze, pilih 7 hari, isi alasan. Board menampilkan "Otomatis aktif lagi ...". Klik Unfreeze.
6. Masuk sebagai `adminboard@demo.test`. Panel kiri ada "Verifikasi Board". Buka kandidat: tombol "Jadikan Official" biru bercentang.
7. Sebagai Penindak Utama, coba Tandai Pelanggaran Board sendiri: ditolak.
8. Tab browser menampilkan favicon hijau dengan T!.

## Hasil Tes

- `npm run lint`: lolos (ESLint dan Prettier).
- `npm test`: server 23 file, 412 tes lolos. Client 23 file, 86 tes lolos.
- `npm run build -w client`: lolos.
- QA visual dengan Chrome headless di 1280 px dan 390 px terhadap data demo: tidak ada scroll horizontal.

## Keputusan dan Alasan

- Phosphor dipilih karena punya bobot `fill` dan `duotone` yang membuat ikon lebih berwarna. Ikon di-import per nama sehingga ter-tree-shake. Lucide dihapus agar hanya ada satu pustaka ikon.
- Reaksi tidak lagi memakai popover. Tiga tombol langsung terlihat, sehingga lebih jelas dan lebih cepat dipakai di HP.
- Durasi freeze mengikuti pola ban (pilihan tetap, bukan tanggal bebas) agar sederhana. Unfreeze otomatis memakai job terjadwal yang sudah ada.
- Foto demo diambil dari Wikimedia Commons (lisensi bebas). Sesuai permintaan pemilik proyek, sumber tidak ditampilkan di UI.
- Penindak dilarang menandai Board sendiri karena tanda "Board Palsu" dari pengelolanya tidak masuk akal dan bisa dipakai untuk memanipulasi antrean moderasi.

## Hal yang Belum Selesai

- Database dev lokal (`tindak`) masih berisi foto lama dari seed dev. Foto asli baru muncul setelah seed demo dijalankan di database demo. Database utama tidak di-reset tanpa izin.
- Di luar scope: bundle JS client sekitar 1,7 MB (peringatan ukuran chunk Vite). Bukan dari ikon. Bisa dipecah dengan lazy route di fase berikutnya.

## Catatan untuk Fase Berikutnya

- Ikon baru ditambahkan lewat `AppIcons.jsx` agar warnanya konsisten. Jangan menambah emoji di teks UI atau di `shared`.
- Warna baru untuk kelas Tailwind harus didaftarkan di blok `@theme static` (`--color-*`) di `index.css`.
- Freeze wajib mengirim `duration`. Klien lama yang hanya mengirim `reason` akan mendapat 400.
