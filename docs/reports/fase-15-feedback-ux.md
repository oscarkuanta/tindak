# Laporan Fase 15: Perbaikan dari Hasil Testing UI/UX

- Branch: `feat/f15-feedback-ux`
- Pemilik: Oscar
- Tanggal: 2026-10-08
- PR: (diisi setelah PR dibuat)

## Ringkasan

Fase ini menindaklanjuti hasil testing UI/UX dari anggota tim. Ada delapan temuan: tamu langsung dilempar ke halaman masuk, foto harus dikompres sendiri oleh user, tamu tidak diberi tahu kenapa mendapat Kode Lacak, kontras warna rendah, Beranda menampilkan laporan populer dari kota lain, foto laporan terpotong, dan tombol Laporkan Masalah kurang menonjol. Semua temuan diperbaiki.

## Yang Dikerjakan

- **Halaman khusus akun tidak langsung mengalihkan tamu.** Tamu yang membuka Board Diikuti, Board Saya, Laporan Saya, Notifikasi, Undangan, Profil, Buat Board, Panel Admin, atau Verifikasi melihat pesan sesuai halaman, dan popup login yang sama seperti tombol Buat Board muncul. Setelah masuk, user kembali ke halaman itu.
- **Foto dikompres otomatis di browser.** Foto dari kamera HP (5–50 MB) diperkecil ke sisi terpanjang 1920 px dan dikompres JPEG sampai di bawah batas server 5 MB, sebelum dikirim. Orientasi EXIF diikuti. Berlaku di form laporan, foto sesudah dari Penindak, dan foto tambahan dari pelapor. Batas file asli 60 MB. File yang bukan foto ditolak dengan pesan yang jelas.
- **Halaman sukses tamu menjelaskan Kode Lacak.** Ada kotak "Kenapa kamu mendapat Kode Lacak?" yang menjelaskan bahwa laporan tamu tidak tersimpan di akun mana pun, kode dipakai untuk memantau dan menanggapi laporan, serta peringatan agar tautan rahasia tidak dibagikan. Ada ajakan daftar akun gratis.
- **Kontras warna dinaikkan.**
  - Warna merek untuk teks dan tombol diganti hijau tua (`--mint-700` #0b7a57, sekitar 5:1 terhadap putih).
  - Hover memakai `--mint-800`.
  - Teks redup (`--ink-3`) digelapkan.
  - Header, navigasi bawah HP, dan tombol Dukung aktif memakai gradasi hijau tua agar teks putih terbaca.
- **Laporan terdekat lebih dulu.**
  - Beranda punya tab baru **Sekitarmu** yang menjadi default, berisi laporan dari Board di kota user.
  - Kota dipilih sekali lewat kotak pencarian kota dan disimpan di browser. Untuk user yang sudah login, kota ditebak dari Board yang paling banyak diikuti.
  - Halaman Jelajahi Board dan kotak Board Populer di samping juga otomatis memakai kota itu, dengan pilihan "Tampilkan semua kota".
- **Foto laporan tidak terpotong.** Foto ditampilkan utuh (`object-fit: contain`) di atas salinan dirinya yang diburamkan sebagai latar, seperti Reddit dan Twitter. Berlaku di kartu feed, detail laporan, dan perbandingan sebelum/sesudah.
- **Hierarki navigasi.** Laporkan Masalah tetap berisi putih, dengan teks hijau tema yang tebal, ukuran lebih besar, dan cincin putih, sehingga paling menonjol di header. Tombol tengah navigasi bawah HP memakai gaya yang sama. Buat Board menjadi tombol garis, Masuk dan Daftar tetap putih.

## File Penting

| File                                                                            | Keterangan                                         |
| ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `client/src/features/auth/RequireAuth.jsx`                                      | Pesan login per halaman dan popup login untuk tamu |
| `client/src/lib/compressImage.js`                                               | Kompresi foto di browser                           |
| `client/src/components/reports/PhotoUploader.jsx`                               | Uploader memakai kompresi otomatis                 |
| `client/src/pages/report-success/ReportSuccessPage.jsx`                         | Penjelasan Kode Lacak untuk tamu                   |
| `client/src/features/location/myCity.js`                                        | Kota pilihan user (disimpan di browser)            |
| `client/src/pages/home/HomePage.jsx`                                            | Tab Sekitarmu dan pemilih kota                     |
| `client/src/pages/search-boards/SearchBoardsPage.jsx`                           | Default filter kota user                           |
| `client/src/app/layouts/RightSidebar.jsx`                                       | Board Populer di kota user                         |
| `client/src/components/reports/BlurredImage.jsx`                                | Bingkai foto utuh dengan latar blur                |
| `client/src/components/ui/buttonStyles.js`, `client/src/app/layouts/Header.jsx` | Varian tombol `accent` dan `outlineLight`          |
| `client/src/index.css`                                                          | Token warna baru dan `.photo-frame`                |
| `shared/src/schemas/reports.js`, `shared/src/constants/reports.js`              | Tab `nearby` dan query `city`                      |
| `server/src/modules/reports/reports.service.js`                                 | Filter kota untuk feed Sekitarmu                   |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada endpoint baru. Perubahan kontrak di `docs/API.md`:

| Method | Path             | Auth     | Keterangan                                                    |
| ------ | ---------------- | -------- | ------------------------------------------------------------- |
| GET    | `/api/feed/home` | Opsional | Tab baru `nearby` dengan query `city` wajib (nama kota resmi) |

## Cara Menguji Manual

1. Buka situs tanpa login, klik **Board Diikuti** di panel kiri. Muncul pesan "Masuk untuk melihat Board yang kamu ikuti" dan popup login. Klik Masuk dengan email, lalu masuk. Kamu kembali ke Board Diikuti.
2. Di Beranda, tab **Sekitarmu** aktif. Pilih "Kota Surabaya". Feed hanya berisi laporan dari Board di Surabaya. Buka Jelajahi Board: yang tampil Board di Surabaya, dengan tombol "Tampilkan semua kota".
3. Buat laporan sebagai tamu dengan foto langsung dari kamera HP berukuran besar. Foto diterima tanpa pesan ukuran. Setelah terkirim, halaman sukses menjelaskan kenapa ada Kode Lacak.
4. Lihat kartu laporan dengan foto potret atau panorama. Foto tampil utuh dengan latar blur di sisi kosong.
5. Cek header: tombol Laporkan Masalah kuning paling menonjol. Teks hijau dan tombol hijau terbaca jelas.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 23 file, 413 tes lolos. Client 25 file, 92 tes lolos.
- Cek di browser: navigasi Beranda ke Jelajahi Board dan ke Board Diikuti lancar. Tidak ada scroll horizontal di lebar 390 px.

## Keputusan dan Alasan

- **Kota disimpan di browser, bukan di akun.** Tamu juga perlu feed terdekat, dan cara ini tidak butuh perubahan skema sebelum batas pengumpulan.
- **Relevansi dihitung per kota, bukan jarak GPS.** Board hanya menyimpan nama kota resmi, belum punya koordinat.
- **Kompresi di client tetap dijaga batas server 5 MB.** Server tetap memvalidasi ulang tipe dan ukuran file, jadi kompresi di browser bukan satu-satunya pengaman.
- **Warna merek digelapkan.** Hijau mint terang tidak memenuhi kontras WCAG AA untuk teks atau tombol bertulisan putih. Mint terang tetap dipakai untuk aksen dan latar.

## Hal yang Belum Selesai

- Foto HEIC dari iPhone hanya bisa dibaca di Safari. Di browser lain, user diminta memakai JPG atau PNG.
- Beberapa tes client sebelumnya tidak memalsukan request API, sehingga request-nya ikut terkirim ke server dev yang sedang berjalan dan hasilnya tidak stabil. Tes halaman sukses dan tes lonceng notifikasi sudah diperbaiki.

## Catatan untuk Fase Berikutnya

- Setiap tes yang memakai `renderApp` harus memanggil `mockApi`, minimal untuk `GET /auth/me`.
- Untuk teks hijau, pakai `text-brand` atau `text-mint-700`, bukan `--mint` terang.
