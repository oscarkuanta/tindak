# Laporan Fase 10B: Dashboard Statistik Penindak

- Branch: `feat/f10b-dashboard`
- Pemilik: Akmal
- Tanggal: 2026-10-07
- PR: -

## Ringkasan

Fase ini menambahkan halaman Dashboard Statistik Board untuk OWNER dan HANDLER, lengkap dengan pemilihan rentang, ringkasan metrik dan rating, grafik kategori dan tren mingguan, tabel laporan prioritas, serta tautan ekspor CSV. Halaman memakai kontrak Fase 10A melalui TanStack Query dan menampilkan akses ditolak ketika server mengembalikan 403.

## Yang Dikerjakan

- Menambahkan route `/b/:slug/dashboard` di dalam `BoardLayout` dan `RequireAuth`.
- Menambahkan hook `useBoardStats` dengan query key `['boards', slug, 'stats', range]` dan validasi query memakai `boardStatsQuerySchema` dari shared.
- Menampilkan kartu angka, grafik kategori, tren mingguan, laporan Berbahaya terlambat, lima laporan aktif tertua, kinerja Penindak jika API mengirim data, serta TrustBadge dan StarDistribution.
- Menambahkan pemilih rentang dengan label shared, format tanggal Indonesia, dan tautan ekspor CSV.
- Menambahkan tautan Dashboard di halaman Board untuk OWNER dan HANDLER.
- Menambahkan tes untuk kartu dan rating, data HANDLER tanpa tabel kinerja, pemuatan rentang baru, tampilan 403, serta tautan dari halaman Board.
- Memastikan referensi desain `docs/design/ui-reference.html` tetap lolos pemeriksaan format.

## File Penting

| File                                                     | Keterangan                                      |
| -------------------------------------------------------- | ----------------------------------------------- |
| `client/src/features/stats/api.js`                       | Permintaan statistik dan validasi query shared. |
| `client/src/features/stats/hooks.js`                     | TanStack Query hook dan query key.              |
| `client/src/pages/board-stats/BoardStatsPage.jsx`        | Halaman Dashboard Statistik.                    |
| `client/src/pages/board-stats/BoardStatsPage.test.jsx`   | Tes halaman Dashboard.                          |
| `client/src/app/router.jsx`                              | Route Dashboard.                                |
| `client/src/pages/board-detail/BoardDetailPage.jsx`      | Tautan Dashboard bagi Penindak.                 |
| `client/src/pages/board-detail/BoardDetailPage.test.jsx` | Tes tautan Dashboard.                           |
| `client/package.json`, `package-lock.json`               | Menambahkan Recharts untuk grafik.              |
| `docs/PROGRESS.md`                                       | Menandai Fase 10B sedang dikerjakan.            |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada. Dashboard memakai `GET /api/boards/:slug/stats` dan kontrak di bagian Fase 10 `docs/API.md` tidak berubah.

## Cara Menguji Manual

1. Jalankan aplikasi dengan database demo dan masuk sebagai `ratna@demo.test` memakai kata sandi `demo1234`.
2. Buka Board Jalan Ahmad Yani, pilih **Dashboard**, lalu ganti rentang 7, 30, dan 90 hari.
3. Pastikan kartu angka, grafik, laporan terlambat, laporan aktif tertua, kinerja Penindak, ringkasan rating, dan tautan ekspor terlihat.
4. Masuk sebagai `maya@demo.test` dan pastikan dashboard tampil tanpa tabel kinerja Penindak.
5. Masuk sebagai pengguna biasa `siti@demo.test`, lalu buka `/b/jalan-ahmad-yani/dashboard`; server harus menolak akses dan halaman menampilkan 403.

## Hasil Tes

- `npm run build`: lolos. Vite memberi peringatan bahwa bundle JavaScript utama melebihi 500 kB setelah minifikasi.
- `npm run test -w client -- --maxWorkers=1`: lolos, 23 file dan 85 tes.
- Tes terarah `BoardStatsPage` dan `BoardDetailPage`: lolos, 6 tes.
- `npm test`: belum dapat menjalankan tes server karena `.env.test` tidak tersedia dan MySQL lokal pada port 3306 tidak aktif. Pemeriksaan keamanan tes menghentikan proses sebelum tes berjalan.
- `npm run lint`: ESLint selesai, tetapi langkah Prettier gagal pada file tracked `ui-reference.html` di root repo. File tersebut berada di luar batas perubahan `client/` dan `docs/`; file `docs/design/ui-reference.html` lolos pemeriksaan format.

## Keputusan dan Alasan

- Memilih Recharts karena grafiknya berbentuk komponen React dan cocok dengan struktur data Dashboard tanpa pengelolaan canvas manual.
- Menyetujui perubahan `package-lock.json` di root untuk mengunci versi dependensi Recharts agar instalasi CI konsisten.
- Warna grafik menggunakan variabel design token yang sudah dipakai Tailwind; halaman tidak menambahkan nilai hex.

## Hal yang Belum Selesai

- Uji manual di browser belum dilakukan karena lingkungan lokal tidak menyediakan database tes/demo yang aktif.
- Pemeriksaan `npm run lint` penuh masih gagal pada `ui-reference.html` root yang tidak termasuk folder perubahan yang diizinkan.
- Tes server belum berjalan tanpa `.env.test` dan layanan MySQL untuk database tes.

## Catatan untuk Fase Berikutnya

- Fase 11B baru dimulai setelah Fase 10B digabung ke `dev`.
- Jalankan uji demo dan pemeriksaan browser untuk memastikan kontrak API statistik sesuai dengan data seed; laporkan masalah backend ke Oscar.
