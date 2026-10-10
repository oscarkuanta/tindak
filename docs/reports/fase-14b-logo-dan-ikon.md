# Laporan Fase 14B: Logo dan Ikon

- Branch: `feat/f14b-icon-redesign`
- Pemilik: Akmal
- Tanggal: 2026-10-08
- PR: Belum dibuat

## Ringkasan

Fase ini merapikan identitas visual logo dan status Official melalui simbol vektor sederhana yang mengikuti palet T!indak. Ikon fungsi yang sudah memakai pustaka Phosphor sejak Fase 13 tetap digunakan, sementara logo utama, favicon, dan centang Official kini memakai bentuk yang konsisten dan ringkas.

## Yang Dikerjakan

- Membuat tanda seru SVG khusus dengan garis sinyal kecil untuk wordmark T!NDAK.
- Mengganti simbol pada badge Official menjadi lingkaran biru solid dengan centang putih.
- Menyelaraskan favicon dengan simbol brand dan warna mint-teal.
- Menambahkan tes untuk simbol logo dan bentuk centang Official.
- Tidak menambah dependency, endpoint, skema database, atau perubahan pada `server/` dan `shared/`.

## File Penting

| File                                                | Keterangan                                        |
| --------------------------------------------------- | ------------------------------------------------- |
| `client/src/components/icons/BrandAssets.jsx`       | Simbol wordmark dan centang Official berbasis SVG |
| `client/src/app/layouts/Logo.jsx`                   | Wordmark menggunakan simbol baru                  |
| `client/src/app/layouts/Logo.test.jsx`              | Tes label, tautan, dan simbol logo                |
| `client/src/components/boards/BoardBadges.jsx`      | Badge Official menggunakan centang lingkaran baru |
| `client/src/components/boards/BoardBadges.test.jsx` | Tes geometri centang Official                     |
| `client/src/index.css`                              | Ukuran dan penyelarasan simbol wordmark           |
| `client/public/favicon.svg`                         | Favicon dengan simbol brand yang sesuai           |
| `docs/PROGRESS.md`                                  | Status Fase 14B                                   |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada. Tidak ada perubahan kontrak di `docs/API.md`.

## Cara Menguji Manual

1. Jalankan `npm run dev` dan buka beranda.
2. Periksa logo T!NDAK pada header dan halaman autentikasi; pastikan tanda seru dan garis sinyal tampil seimbang.
3. Buka Board Official dan Board Komunitas; pastikan centang Official berupa lingkaran biru solid dan tetap berbeda dari badge Komunitas serta Trust.
4. Muat ulang tab browser untuk melihat favicon baru.

## Hasil Tes

- `npm run lint`: lolos.
- `npm run build -w client`: lolos; Vite menampilkan peringatan ukuran chunk besar yang juga sudah dicatat pada Fase 13.
- `npm run test -w client -- --pool=threads --maxWorkers=1 --reporter=dot`: 25 file dan 90 tes lolos.
- `npm test`: gagal pada global setup server karena MySQL untuk database test `tindak_test` tidak dapat dijangkau di `127.0.0.1:3306`; konfigurasi Vitest server juga tidak menemukan file tes.

## Keputusan dan Alasan

- Simbol brand dibuat sebagai SVG supaya bentuknya tetap tajam pada semua ukuran dan bisa mengikuti warna melalui `currentColor`.
- Phosphor tetap menjadi pustaka ikon fungsi karena sudah konsisten digunakan di aplikasi. Perubahan khusus difokuskan pada aset brand dan badge identitas.
- Tidak memakai generator gambar raster untuk ikon antarmuka agar bentuk kecil tetap jelas, ringan, dan mengikuti garis visual yang sama.

## Hal yang Belum Selesai

- Pemeriksaan manual lintas browser belum dilakukan.
- Tes server penuh memerlukan MySQL lokal dan database terpisah `tindak_test` yang dapat dijangkau.

## Catatan untuk Fase Berikutnya

- Ikon fungsi baru sebaiknya tetap memakai Phosphor dan pemetaan warna di `client/src/components/icons/AppIcons.jsx`.
- Logo, favicon, dan centang Official memakai aset SVG di `BrandAssets.jsx` dan `client/public/favicon.svg`.
