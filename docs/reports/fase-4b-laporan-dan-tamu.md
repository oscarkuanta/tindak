# Laporan Fase 4B: Laporan dan Tamu

- Branch: `feat/f4b-reports`
- Pemilik: Akmal
- Tanggal: 2026-10-05
- PR: [#16](https://github.com/oscarkuanta/tindak/pull/16)

## Ringkasan

Frontend Fase 4B menambahkan alur membuat laporan, melihat feed dan detail laporan, serta menyimpan dan menggunakan Kode Lacak. Implementasi mengikuti kontrak Fase 4 yang ditambahkan ke `docs/API.md`; endpoint backend Fase 4A belum tersedia untuk uji integrasi langsung.

## Yang Dikerjakan

- Membuat pemilih Board, form laporan responsif, pilihan tingkat bahaya, validasi bersama, unggah hingga empat foto, opsi anonim untuk user login, serta widget Turnstile.
- Menambahkan halaman laporan terkirim, pelacakan dengan tautan rahasia, daftar laporan tersimpan di perangkat, detail laporan, dan Laporan Saya.
- Menghubungkan feed Board ke API, menampilkan kartu laporan, filter tab, pagination, foto, status, lokasi, dan kategori.
- Menambahkan kontrak API Fase 4, skema dan konstanta laporan di shared, serta konfigurasi public site key Turnstile.

## File Penting

| File                                                                                                                  | Keterangan                                                     |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `client/src/pages/create-report/`                                                                                     | Pemilih Board, form laporan, dan tes form                      |
| `client/src/pages/track-report/` dan `client/src/pages/report-success/`                                               | Pelacakan dan halaman sukses                                   |
| `client/src/pages/report-detail/`, `client/src/pages/device-reports/`, `client/src/pages/my-reports/`                 | Halaman detail dan daftar laporan                              |
| `client/src/features/reports/`                                                                                        | API, TanStack Query hooks, dan penyimpanan Kode Lacak          |
| `client/src/components/reports/`                                                                                      | Pemilih bahaya, unggah foto, badge, kartu, timeline, Turnstile |
| `shared/src/schemas/reports.js` dan `shared/src/constants/reports.js`                                                 | Validasi dan label bersama                                     |
| `client/src/app/router.jsx`, `client/src/pages/board-detail/BoardDetailPage.jsx`, `client/src/app/layouts/Header.jsx` | Rute, feed Board, dan aksi lapor                               |
| `docs/API.md`, `docs/PROGRESS.md`, `.env.example`, `client/vite.config.js`                                            | Kontrak, progres, dan konfigurasi frontend                     |

## Perubahan Database

Tidak ada. Bagian ini hanya mengubah client, shared, dan dokumentasi.

## Endpoint Baru

| Method    | Path                               | Auth | Keterangan                                        |
| --------- | ---------------------------------- | ---- | ------------------------------------------------- |
| Tidak ada | Endpoint backend dibuat di Fase 4A | -    | Frontend memakai kontrak Fase 4 di `docs/API.md`. |

## Cara Menguji Manual

1. Isi `VITE_TURNSTILE_SITE_KEY` di `.env` root, lalu siapkan backend Fase 4A dan jalankan `npm run dev`.
2. Buka `/lapor`, cari Board, lalu pilih Board untuk membuka form.
3. Isi laporan, unggah satu sampai empat foto, selesaikan Turnstile, dan kirim.
4. Di halaman sukses, salin Kode Lacak atau tautan rahasia. Buka `/laporan-perangkat-ini` untuk melihat laporan tersimpan dan buka tautan untuk memeriksa status serta timeline.
5. Buka halaman Board untuk memeriksa feed, lalu pilih salah satu kartu untuk melihat detail. Login untuk mencoba opsi anonim dan `/laporan-saya`.

## Hasil Tes

- `npm run lint`: lolos.
- `npm run test -w client`: 14 file tes dan 37 tes lolos.
- `npm run build -w client`: lolos. Vite memperingatkan bundle JavaScript berukuran 549,21 kB, di atas ambang 500 kB.
- `npm test`: belum dapat berjalan sampai tes server. Global setup membatalkan tes karena `.env.test` tidak tersedia dan `DATABASE_URL` kosong; guard menghentikan proses sebelum migrasi atau perubahan database.

## Keputusan dan Alasan

- Kode lacak saja tidak cukup untuk membaca status karena endpoint memerlukan secret. Frontend memakai secret yang tersimpan di browser ini atau dari tautan rahasia.
- Public site key dibaca dari `VITE_TURNSTILE_SITE_KEY`; rahasia Turnstile server tidak dikirim ke bundle frontend.

## Hal yang Belum Selesai

- Uji integrasi browser terhadap backend Fase 4A dan Turnstile belum dapat dilakukan karena backend Fase 4A belum tersedia.
- Tes server dalam `npm test` perlu dijalankan setelah `.env.test` menunjuk ke database tes.

## Catatan untuk Fase Berikutnya

- Cocokkan bentuk respons endpoint backend dengan kontrak Fase 4 pada `docs/API.md`, terutama field multipart `turnstileToken` dan file berulang `photos`.
- Pertimbangkan pemecahan bundle halaman saat fase optimasi agar ukuran JavaScript awal turun di bawah 500 kB.
