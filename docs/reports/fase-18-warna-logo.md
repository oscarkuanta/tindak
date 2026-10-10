# Laporan Fase 18: Warna Tema, Logo, Notifikasi, dan Undangan

- Branch: `fix/f18-warna-logo`
- Pemilik: Oscar
- Tanggal: 2026-10-10
- PR: (diisi setelah PR dibuat)

## Ringkasan

Revisi dari testing tim: warna tema baru, logo dari desain tim, teks panel notifikasi yang tidak terbaca, dan kartu undangan Penindak yang bisa diklik.

## Yang Dikerjakan

- **Warna tema.**
  - Header dan navigasi bawah HP memakai gradasi `linear-gradient(90deg, #1FE8A9 0%, #2E9C7A 75%)`.
  - Hijau utama (`--brand`) menjadi `#28BC8D`, hover `#1F9C75`.
  - Warna putih kartu dan permukaan (`--surface`) menjadi `#F8FFF8`.
- **Logo dari desain tim.**
  - `docs/design/TindakFull.svg` dipakai sebagai logo utama di header dan halaman masuk (komponen `TindakLogo`, warnanya mengikuti `currentColor`).
  - `docs/design/TindakExclaim.svg` dipakai untuk favicon.
  - Wordmark buatan lama dihapus.
- **Panel notifikasi terbaca.** Panel notifikasi, menu akun, dan saran pencarian berada di dalam header yang berwarna teks putih, sehingga teksnya ikut putih. Sekarang ketiganya memakai warna teks sendiri.
- **Undangan Penindak bisa diklik.** Seluruh kartu undangan membuka halaman Board, sedangkan tombol Terima dan Tolak tetap bekerja. Notifikasi undangan untuk semua role membuka halaman Undangan ini.

## File Penting

| File                                                                                                                  | Keterangan                                        |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `client/src/index.css`                                                                                                | Token warna, gradasi header, logo, kartu undangan |
| `client/src/components/icons/BrandAssets.jsx`                                                                         | Komponen `TindakLogo` dari SVG desain tim         |
| `client/src/app/layouts/Logo.jsx`                                                                                     | Logo baru                                         |
| `client/public/favicon.svg`                                                                                           | Favicon dari tanda seru desain tim                |
| `client/src/components/notifications/NotificationBell.jsx`, `app/layouts/UserMenu.jsx`, `app/layouts/BoardSearch.jsx` | Warna teks panel di header                        |
| `client/src/pages/invitations/InvitationsPage.jsx`                                                                    | Kartu undangan bisa diklik                        |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada. Tidak ada perubahan kontrak API.

## Cara Menguji Manual

1. Buka Beranda. Header bergradasi dari hijau terang ke hijau tua, logo T!NDAK dari desain tim, dan kartu berwarna putih kehijauan.
2. Klik lonceng notifikasi. Teks notifikasi terbaca jelas.
3. Sebagai akun yang punya undangan, buka Undangan Penindak, lalu klik kartunya. Halaman Board terbuka.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test` client: 27 file, 105 tes lolos.
- Cek di browser: Beranda dengan panel notifikasi, halaman Undangan, dan halaman masuk di HP.

## Keputusan dan Alasan

- Logo dipasang sebagai SVG inline dengan `currentColor`, supaya bisa putih di header dan hijau di halaman masuk tanpa dua file.

## Hal yang Belum Selesai

- Hijau terang di bagian kiri header dan hijau utama `#28BC8D` sebagai latar teks putih memiliki kontras di bawah standar WCAG AA. Ini mengikuti keputusan desain tim.

## Catatan untuk Fase Berikutnya

- Panel yang dibuka dari header harus memberi warna teks sendiri (`text-text`), karena header mewariskan teks putih.
