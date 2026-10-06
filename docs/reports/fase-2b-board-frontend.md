# Laporan Fase 2B: Board Frontend

- Branch: `feat/f2b-board-ui` (berdasarkan commit `origin/dev` yang tersedia saat fase dimulai)
- Pemilik: Akmal
- Tanggal: 2026-10-04
- PR: [#14](https://github.com/oscarkuanta/tindak/pull/14) — CI lulus, menunggu review

## Ringkasan

Frontend Board kini memiliki alur Buat Board, pencarian, detail publik, Board Saya, dan pengaturan khusus Penindak Utama. Implementasi memakai TanStack Query, skema Zod dan label dari `shared`, serta token desain dari Fase 1B. Tidak ada file backend atau skema database yang diubah. Integrasi browser dengan backend dan akun seed belum dapat dicoba karena Fase 2A belum tersedia di `dev` pada saat pengerjaan.

## Yang Dikerjakan

- `/buat-board`: wizard tiga langkah, validasi per langkah, pemilihan kota yang dapat dicari, tujuh jenis Board, peringatan Board serupa, kategori bawaan dan tambahan, target Berbahaya 48 jam, ringkasan, toast sukses, serta tautan Board Saya untuk `BOARD_LIMIT_REACHED`.
- `/b/:slug`: halaman Board publik dengan header sampul/inisial, badge verifikasi dan jenis, tab feed tampilan, status laporan kosong, statistik, kategori, tombol Ikuti/Laporkan Masalah, dan tautan pengaturan untuk OWNER. Halaman 404 menyediakan tautan pencarian.
- `/cari`: pencarian Board dengan filter kota, jenis, dan verifikasi tersimpan di URL, kartu Board, pagination, skeleton, dan status kosong.
- `/board-saya`: daftar peran Penindak Utama/Penindak, badge, tautan Board/pengaturan, hitungan batas tiga Board, serta tombol yang nonaktif saat batas tercapai.
- `/b/:slug/pengaturan`: perlindungan OWNER/403, informasi Board, keterangan field tetap, status verifikasi, pengelolaan kategori termasuk urutan, dan placeholder Penindak Fase 3.
- Header, sidebar, menu peran ADMIN/BOARD_ADMIN, autocomplete dengan debounce 300 ms dan navigasi keyboard, serta komponen badge, kartu, pemilih kota, empty state, skeleton, dan toast.
- Catatan untuk desainer: `OfficialBadge` memakai centang dalam lingkaran biru solid. `TrustBadge` memakai label netral berbentuk outline dan harus tetap jelas berbeda saat desain final Fase 8 diterapkan.

## File Penting

| File                                                                | Keterangan                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `client/src/app/router.jsx`                                         | Route publik, route RequireAuth, dan layout Board          |
| `client/src/features/boards/api.js` dan `hooks.js`                  | Pemanggilan API, query key, mutation, dan invalidasi cache |
| `client/src/pages/create-board/CreateBoardPage.jsx`                 | Wizard pembuatan Board                                     |
| `client/src/pages/board-detail/BoardDetailPage.jsx`                 | Detail Board publik dan keadaan 404                        |
| `client/src/pages/search-boards/SearchBoardsPage.jsx`               | Pencarian, filter URL, dan pagination                      |
| `client/src/pages/my-boards/MyBoardsPage.jsx`                       | Daftar Board user dan batas pembuatan                      |
| `client/src/pages/board-settings/BoardSettingsPage.jsx`             | Informasi, verifikasi, dan kategori Board                  |
| `client/src/components/boards/BoardBadges.jsx`                      | OfficialBadge, CommunityBadge, TrustBadge, dan ScopeBadge  |
| `shared/src/constants/boards.js` dan `shared/src/schemas/boards.js` | Enum/label/kategori dan skema Zod Board                    |
| `docs/API.md`                                                       | Kontrak endpoint pengurutan kategori                       |

## Perubahan Database

Tidak ada.

## Endpoint Baru

| Method | Path                                 | Auth  | Keterangan                                                                                                                                     |
| ------ | ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PUT    | `/api/boards/:slug/categories/order` | OWNER | Kontrak untuk menyimpan urutan kategori; frontend mengirim seluruh ID kategori sesuai urutan baru. Endpoint backend belum tersedia di Fase 2A. |

`docs/API.md` diperbarui untuk mencatat kontrak tersebut. Parameter filter URL `scopeType` dipetakan frontend menjadi query API `type`, sesuai kontrak pencarian yang sudah ada.

## Cara Menguji Manual

Jalankan `npm run dev` setelah backend Fase 2A tersedia dan migrasi/seed fase dijalankan. Gunakan akun serta Board seed yang dicantumkan di laporan Fase 2A; laporan dan seed itu belum ada pada `origin/dev` saat pengerjaan ini, jadi kredensial tidak dicantumkan di sini.

- [ ] Sebagai user, buka `/buat-board`; periksa validasi langkah, pindah maju/mundur, kategori, peringatan Board serupa, lalu buat Board.
- [ ] Buka Board hasilnya; coba tab, tombol placeholder, tampilan Community/Official, dan 404 untuk slug yang tidak ada.
- [ ] Buka `/cari`; ubah kota, jenis, verifikasi, dan halaman. Pastikan query URL ikut berubah.
- [ ] Buka `/board-saya`; pastikan peran dan batas pembuatan sesuai akun seed.
- [ ] Sebagai OWNER, ubah informasi dan kategori di pengaturan. Sebagai non-OWNER/tamu, pastikan muncul 403.
- [ ] Sebagai BOARD_ADMIN dan ADMIN, periksa masing-masing tautan placeholder pada menu akun.

## Hasil Tes

- `npm run lint`: lolos.
- `npm run build`: lolos; bundler memberi peringatan bahwa chunk JavaScript utama sedikit di atas 500 kB.
- `npm run test -w client -- --maxWorkers=1`: 9 file dan 30 tes lolos.
- `npm test`: belum dapat berjalan sampai tes server, karena `DATABASE_URL` untuk database test kosong (`.env.test` belum tersedia/terisi). Tidak ada konfigurasi server atau database yang diubah.

## Keputusan dan Alasan

- Filter URL memakai nama `scopeType` yang diminta UI, lalu dipetakan ke parameter API `type` agar tetap mengikuti `docs/API.md`.
- Endpoint pengurutan kategori dicatat sebagai kontrak agar tombol naik/turun dapat menyimpan urutan. Backend perlu mengimplementasikan route tersebut sebelum alur kategori dapat diuji end-to-end.
- Respons detail Board yang didokumentasikan belum menyertakan informasi pemilik; kolom Pemilik menampilkan “Belum ada data” sampai kontrak menyediakan field itu.
- Komponen UI kecil dan gaya Fase 1B dipertahankan. Warna/font tetap memakai token desain.

## Hal yang Belum Selesai

- Uji browser dengan backend dan akun seed Fase 2A menunggu Fase 2A tersedia di `dev`.
- Endpoint `PUT /api/boards/:slug/categories/order` perlu diimplementasikan oleh backend.
- `npm test` penuh menunggu konfigurasi database test; seluruh tes client sudah lolos.
- Belum ada kredensial atau Board Official seed yang dapat dipakai untuk checklist manual.

## Catatan untuk Fase Berikutnya

- Tombol Ikuti dan Laporkan Masalah, isi feed laporan, Board Diikuti, serta panel verifikasi/admin saat ini berupa placeholder sesuai batas fase.
- Gunakan `client/src/index.css` dan token Fase 1B untuk penyesuaian visual UI/UX. Jaga tampilan `OfficialBadge` tetap berbeda dari `TrustBadge` otomatis Fase 8.
- Tambahkan field pemilik ke kontrak Board bila halaman perlu menampilkan nama pemilik.
