# Laporan Fase 3B: Ikuti Board dan Kelola Penindak

- Branch: `feat/f3b-follow-handler` (berdasarkan `origin/dev` commit `7fee14e`)
- Pemilik: Akmal
- Tanggal: 2026-10-04
- PR: [#15](https://github.com/oscarkuanta/tindak/pull/15)

## Ringkasan

Frontend mengikuti dan mengelola Board kini memakai endpoint Fase 3 melalui TanStack Query. Tombol Ikuti, pengaturan notifikasi, daftar Board diikuti, undangan Penindak, dan alih kepemilikan sudah memiliki alur UI. Tidak ada file `server/` atau skema database yang diubah. Endpoint backend Fase 3A belum tersedia pada `origin/dev` saat implementasi dimulai, sehingga uji browser end-to-end menunggu bagian A.

## Yang Dikerjakan

- Tombol Ikuti pada detail dan kartu Board mendukung login lewat LoginModal, follow/unfollow, menu tingkat notifikasi, dan optimistic update dengan pemulihan cache jika request gagal.
- Sidebar menampilkan Board yang diikuti user. `/board-diikuti` menampilkan daftar Board dan tingkat notifikasinya.
- Pengaturan Board menampilkan Penindak aktif/diundang, mengirim undangan email, membatalkan undangan atau mencabut akses dengan konfirmasi, dan mengalihkan kepemilikan setelah nama Board diketik.
- `/undangan` menyediakan aksi terima/tolak; menu akun menampilkan jumlah undangan.
- Cache data akun dihapus saat login/logout berubah agar daftar pribadi akun sebelumnya tidak tertinggal.
- Konstanta dan skema Zod Fase 3 ditambahkan di `shared`.
- Kontrak endpoint yang dibutuhkan frontend ditambahkan di `docs/API.md` berdasarkan spesifikasi fase.

## File Penting

| File                                                                       | Keterangan                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `client/src/components/boards/FollowButton.jsx`                            | Aksi ikuti, menu notifikasi, dan LoginModal untuk tamu              |
| `client/src/components/boards/HandlerManagement.jsx`                       | Form undang, status anggota, pencabutan akses, dan alih kepemilikan |
| `client/src/features/boards/api.js` dan `hooks.js`                         | Endpoint Board, optimistic update, query dan invalidasi cache       |
| `client/src/features/invitations/api.js` dan `hooks.js`                    | Daftar, terima, dan tolak undangan                                  |
| `client/src/pages/followed-boards/FollowedBoardsPage.jsx`                  | Halaman `/board-diikuti`                                            |
| `client/src/pages/invitations/InvitationsPage.jsx`                         | Halaman `/undangan`                                                 |
| `client/src/app/router.jsx`, `layouts/LeftNav.jsx`, `layouts/UserMenu.jsx` | Route terlindungi, daftar Board, dan badge undangan                 |
| `shared/src/constants/boards.js` dan `shared/src/schemas/handlers.js`      | Level notifikasi, status anggota, dan validasi                      |
| `docs/API.md`                                                              | Kontrak API yang dipakai frontend                                   |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Frontend memakai kontrak yang dijabarkan di `docs/API.md`; implementasi endpoint berada di bagian backend Fase 3A.

| Method              | Path                              | Auth                               | Keterangan                                     |
| ------------------- | --------------------------------- | ---------------------------------- | ---------------------------------------------- |
| POST, DELETE, PATCH | `/api/boards/:slug/follow`        | Login                              | Ikuti, berhenti mengikuti, dan atur notifikasi |
| GET                 | `/api/me/follows`                 | Login                              | Daftar Board yang diikuti                      |
| POST, GET, DELETE   | `/api/boards/:slug/handlers`      | OWNER / OWNER atau HANDLER / OWNER | Undang, daftar, dan cabut Penindak             |
| GET                 | `/api/me/invitations`             | Login                              | Daftar undangan yang menunggu jawaban          |
| POST                | `/api/me/invitations/:id/accept`  | Login                              | Terima undangan                                |
| POST                | `/api/me/invitations/:id/decline` | Login                              | Tolak undangan                                 |
| POST                | `/api/boards/:slug/transfer`      | OWNER                              | Alihkan kepemilikan ke Penindak aktif          |

## Cara Menguji Manual

Jalankan aplikasi dengan backend Fase 3A dan akun seed yang memiliki user biasa, OWNER, Penindak aktif, serta penerima undangan.

1. Sebagai tamu, buka `/b/:slug` atau `/cari`, klik `Ikuti`, dan pastikan LoginModal terbuka.
2. Sebagai user, ikuti Board dari detail dan kartu. Pastikan hitungan pengikut berubah, Board muncul di sidebar dan `/board-diikuti`, serta menu notifikasi menyimpan ketiga pilihan.
3. Sebagai OWNER, buka Pengaturan Board, undang email terdaftar, periksa status `Diundang`, lalu batalkan undangan. Ulangi dengan akun aktif dan cabut Penindak.
4. Sebagai user yang diundang, buka `/undangan`, terima satu undangan dan tolak undangan lain. Pastikan badge jumlah ikut berubah.
5. Sebagai OWNER, pilih Penindak aktif untuk alih kepemilikan. Pastikan tombol aktif hanya setelah nama Board diketik persis; setelah berhasil, periksa Board mempertahankan status verifikasinya.

## Hasil Tes

- `npm run lint`: lulus.
- `npm run test -w client -- --maxWorkers=1`: lulus, 11 berkas dan 33 test.
- `npm run build`: lulus; Vite memberi peringatan chunk JavaScript utama 519,67 kB, di atas batas peringatan 500 kB.
- `npm test`: berhenti di setup test server karena `.env.test` tidak tersedia dan `DATABASE_URL` tidak disetel. Setup membatalkan tes sebelum migrasi dijalankan. Tidak ada file backend yang diubah.

## Keputusan dan Alasan

- `BoardCard` memisahkan link detail dan tombol Ikuti agar tidak membuat tombol interaktif bersarang di dalam link.
- Objek `viewer` pada Board memuat role user supaya pemilik dan Penindak melihat status perannya, bukan tombol mengikuti Board yang sama.
- Kontrak respons Fase 3 dimasukkan ke `docs/API.md` karena endpoint tersebut belum tercatat di branch `dev`; bagian backend harus mengikuti atau menyelaraskan kontrak saat implementasi A.
- Cache query `me/*` dibersihkan saat sesi berubah, sedangkan cache Board ditandai untuk dimuat ulang agar status follow tidak terbawa antar akun.
- UI tidak mengubah status verifikasi. Saat transfer, Board mempertahankan verification/verifiedAt; audit log dan notifikasi `BOARD_OWNER_CHANGED` tetap menjadi TODO backend sesuai spesifikasi fase.

## Hal yang Belum Selesai

- Uji browser end-to-end menunggu endpoint dan seed backend Fase 3A.
- Tes server penuh perlu dijalankan di lingkungan yang sudah memiliki konfigurasi database tes terisolasi.
- TODO audit log serta notifikasi ke BOARD_ADMIN saat pemilik berubah berada di bagian backend.

## Catatan untuk Fase Berikutnya

- Pastikan backend mengembalikan `viewer.isFollowing`, `viewer.notifyLevel`, dan `viewer.role` pada Board dan kartu pencarian untuk user login.
- Daftar handlers di kontrak ini berisi anggota HANDLER, termasuk undangan yang masih menunggu jawaban. Maksimal 10 anggota termasuk undangan.
- Status verification tidak boleh berubah saat transfer dan tidak boleh dapat diedit OWNER/HANDLER.
