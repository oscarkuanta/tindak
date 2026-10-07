# Laporan Fase 10A: Dashboard Statistik Penindak (Backend)

- Branch: `feat/f10a-dashboard`
- Pemilik: Oscar (bagian A, backend saja; bagian B dikerjakan anggota tim lain)
- Tanggal: 2026-10-07
- PR: [#27](https://github.com/oscarkuanta/tindak/pull/27)

## Ringkasan

Fase ini menambahkan endpoint statistik untuk Penindak: jumlah per status, rata-rata waktu penanganan, tingkat tanggap, laporan Berbahaya tepat waktu dan terlambat, jumlah per kategori, tren mingguan, laporan aktif paling lama, kinerja per Penindak (khusus Penindak Utama), dan ringkasan rating. Endpoint bonus ekspor CSV juga dibuat. Semua angka dihitung dengan agregasi di database.

## Yang Dikerjakan

- `GET /api/boards/:slug/stats?range=7d|30d|90d` untuk OWNER dan HANDLER.
- `GET /api/boards/:slug/export?format=csv&range=` (bonus) dengan perlindungan CSV injection, BOM UTF-8, rate limit, dan tanpa data pelapor.
- Konstanta rentang dan skema query di `shared` agar dipakai juga oleh frontend.
- Nomor PR #26 Fase 9 dicatat di laporan Fase 9 dan PROGRESS.
- Baris Fase 10 di PROGRESS dipecah menjadi 10A dan 10B.

## File Penting

| File                                         | Keterangan                                 |
| -------------------------------------------- | ------------------------------------------ |
| `server/src/modules/stats/stats.service.js`  | Semua perhitungan statistik                |
| `server/src/modules/stats/export.service.js` | Pembuatan CSV                              |
| `server/src/modules/stats/stats.routes.js`   | Route dan hak akses                        |
| `shared/src/constants/stats.js`              | Rentang, label rentang, batas daftar       |
| `shared/src/schemas/stats.js`                | Validasi `range` dan `format`              |
| `server/tests/stats.test.js`                 | Tes angka dengan data uji manual dan akses |

## Perubahan Database

Tidak ada. Statistik dihitung dari tabel yang sudah ada.

## Endpoint Baru

| Method | Path                       | Auth                 | Keterangan        |
| ------ | -------------------------- | -------------------- | ----------------- |
| GET    | `/api/boards/:slug/stats`  | OWNER, HANDLER Board | Statistik Board   |
| GET    | `/api/boards/:slug/export` | OWNER, HANDLER Board | Unduh CSV laporan |

Kontrak lengkap dan contoh respons ada di `docs/API.md` bagian Fase 10.

## Cara Menguji Manual

1. `npm run dev`, lalu masuk sebagai `budi@tindak.test` (password `tindak123`), Penindak Utama Board Jalan Rungkut Madya.
2. Buka `http://localhost:5173/api/boards/jalan-rungkut-madya-surabaya/stats` di browser yang sama: muncul JSON statistik, termasuk `handlers`.
3. Ganti `?range=7d` dan `?range=90d`, angka `totals.total` ikut berubah.
4. Buka `http://localhost:5173/api/boards/jalan-rungkut-madya-surabaya/export`: file CSV terunduh dan terbuka rapi di Excel.
5. Masuk sebagai `siti@tindak.test` (bukan Penindak Board itu) dan buka URL yang sama: 403.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 394 tes lolos (20 file), client 80 tes lolos (22 file).

## Keputusan dan Alasan

- Rentang dihitung dari tanggal laporan dibuat, supaya semua angka dalam satu respons membahas kelompok laporan yang sama. Pengecualian yang disengaja: `oldestActive` (semua laporan aktif) dan `weeklyTrend.resolved` (laporan yang selesai pada minggu itu).
- Rata-rata waktu penanganan diukur sampai Penindak menandai selesai (`AWAITING_CONFIRMATION`), bukan sampai pelapor konfirmasi, karena waktu konfirmasi di luar kendali Penindak.
- Berbahaya tepat waktu hanya menghitung laporan yang sudah bisa dinilai (sudah ditandai selesai atau batasnya lewat). Ditolak dan duplikat tidak dihitung.
- Kinerja per Penindak diambil dari aktor di timeline, bukan dari `assigneeId`, karena timeline mencatat siapa yang benar-benar melakukan aksi.
- Minggu memakai zona WIB (UTC+7) agar sesuai dengan pengguna di Indonesia. Database tidak butuh tabel zona waktu karena selisihnya ditambahkan langsung.
- Laporan tersembunyi tetap dihitung karena tetap ditangani Penindak; laporan yang dihapus Admin tidak dihitung.
- SQL agregat ditulis dengan `prisma.$queryRaw` bertanda template, sehingga nilai dikirim sebagai parameter dan aman dari SQL injection.

## Hal yang Belum Selesai

- Bagian B (halaman `/b/:slug/dashboard`, grafik, tabel, tombol ekspor, link Dashboard dan Antrean di halaman Board) dikerjakan anggota tim lain.

## Catatan untuk Fase 10B (frontend)

- Ambil data dengan TanStack Query di `client/src/features/stats/` (misalnya hook `useBoardStats(slug, range)` dengan key `['boards', slug, 'stats', range]`).
- Pilihan rentang: pakai `STATS_RANGES` dan `STATS_RANGE_LABELS` dari `@tindak/shared`. Validasi query memakai `boardStatsQuerySchema`.
- Tampilkan tabel kinerja Penindak hanya jika `handlers` bukan `null` (hanya Penindak Utama yang mendapat data ini).
- Tombol ekspor cukup berupa link biasa ke `/api/boards/<slug>/export?format=csv&range=<range>`. Cookie login otomatis ikut terkirim, dan browser langsung mengunduh filenya.
- Label status dan tingkat bahaya: `REPORT_STATUS_LABELS` dan `REPORT_SEVERITY_LABELS` dari `@tindak/shared`.
- Data `weeklyTrend` sudah lengkap per minggu (minggu kosong bernilai 0), jadi bisa langsung dipakai untuk grafik garis.
- Untuk mencoba tanpa backend jalan, pakai contoh respons di `docs/API.md` bagian Fase 10 sebagai data mock di tes.
