# Laporan Fase 17: Revisi dari Hasil Testing

- Branch: `fix/f17-revisi-tester`
- Pemilik: Oscar
- Tanggal: 2026-10-09
- PR: (diisi setelah PR dibuat)

## Ringkasan

Fase ini menindaklanjuti temuan testing tim. Isinya: data akun yang terbawa saat ganti akun, alur tamu ke akun, pencarian Laporan Saya, badge notifikasi, validasi aksi Penindak, halaman kategori, undangan Penindak, halaman Board, kartu laporan, dan keterangan laporan terkunci. Satu bug tambahan ditemukan dan diperbaiki: padding bawaan `Card` selalu menimpa `p-0`.

## Yang Dikerjakan

- **Ganti akun bersih.**
  - Saat login, daftar, dan keluar, semua cache data dihapus.
  - Keluar langsung ke Beranda tanpa popup login.
  - Panel Admin dan Dashboard Verifikasi mengarahkan role lain ke Beranda dengan pesan.
  - `returnTo` setelah login ke halaman staf diabaikan jika role tidak cocok.
  - Kota pilihan disimpan per akun.
- **Data tamu disinkronkan ke akun.**
  - Setelah login, laporan yang dikirim sebagai tamu di browser itu dipindahkan ke akun lewat `POST /api/me/reports/claim` dan tetap anonim.
  - Data tamu di browser lalu dihapus.
  - Kota pilihan tamu dipindahkan ke akun.
  - Laporan baru dari akun tidak lagi disimpan di daftar perangkat.
- **Halaman sukses untuk akun:** tanpa penjelasan tamu, peringatan tautan rahasia, dan ajakan daftar. Gantinya, info bahwa laporan tersimpan di akun dan tombol Laporan Saya.
- **Laporan Saya:**
  - Ada pencarian dengan kata kunci atau Kode Lacak.
  - Ada panduan cara memakai Kode Lacak.
  - Kode Lacak tampil di kartu dan detail untuk pelapornya.
- **Badge notifikasi:** badge merah berangka di lonceng dan di menu Notifikasi serta Undangan Penindak di panel kiri.
- **Aksi Penindak:**
  - Proses wajib memilih penanggung jawab, di client dan server.
  - Error pertanyaan, catatan penolakan, catatan penyelesaian, dan foto tampil di kolomnya dengan garis merah.
  - Foto sesudah dan foto tambahan pelapor punya pratinjau, dan foto baru ditambahkan ke daftar (maksimal 4), bukan mengganti.
- **Kategori:** error tambah dan ubah nama tampil di kolomnya dengan garis merah. Setiap kategori berlabel Bawaan atau Tambahan.
- **Undangan Penindak:**
  - Kolom menerima nama atau email.
  - Daftar saran berisi avatar berinisial, nama, dan email yang disamarkan, sesuai `docs/design/ui undangan penindak.jpeg`.
  - Undangan dikirim dengan `userId` dari daftar, atau dengan email lengkap.
- **Halaman Board:**
  - Badge role pindah ke atas nama Board: emas untuk Penindak Utama, hijau solid untuk Penindak.
  - Dashboard dan Pengaturan pindah ke menu titik tiga.
  - Tandai Pelanggaran hanya muncul untuk bukan anggota.
- **Kartu laporan:**
  - Bagian atas berisi Board dengan avatar inisial (atau kategori) dan waktu.
  - Isinya chip status, judul tebal, cuplikan deskripsi dua baris, kategori, dan lokasi berikon.
  - Foto membulat di dalam kartu.
  - Bagian bawah berisi tombol Dukung dan reaksi.
- **Laporan terkunci** diberi keterangan berwarna sesuai alasan, mengikuti `docs/design/kunci post.jpeg`: hijau untuk Selesai, merah untuk Ditolak, abu-abu untuk Duplikat.
- **Bug tambahan:** `Card` sekarang hanya memberi padding bawaan jika tidak ada class padding lain. Sebelumnya banner Board dan kartu laporan ikut menjorok.

## File Penting

| File                                                                                                     | Keterangan                                     |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `client/src/features/auth/hooks.js`, `AccountSync.jsx`, `StaffRedirect.jsx`, `returnTo.js`               | Cache, sinkron data tamu, redirect sesuai role |
| `client/src/features/location/myCity.js`                                                                 | Kota per akun                                  |
| `client/src/pages/report-success/ReportSuccessPage.jsx`                                                  | Tampilan khusus akun                           |
| `client/src/pages/my-reports/MyReportsPage.jsx`                                                          | Pencarian dan panduan Kode Lacak               |
| `client/src/components/reports/HandlerActionPanel.jsx`, `ReporterResponsePanel.jsx`, `PhotoUploader.jsx` | Validasi di kolom dan foto bertambah           |
| `client/src/pages/board-settings/BoardSettingsPage.jsx`                                                  | Error kategori dan label                       |
| `client/src/components/boards/HandlerManagement.jsx`                                                     | Undangan lewat nama atau email                 |
| `client/src/components/boards/BoardMenu.jsx`, `RoleChip.jsx`                                             | Menu dan badge role Board                      |
| `client/src/components/reports/ReportCard.jsx`, `LockNotice.jsx`                                         | Kartu laporan dan keterangan kunci             |
| `server/src/modules/reports/reports.service.js`                                                          | Klaim laporan tamu, cari Laporan Saya          |
| `server/src/modules/reports/handling.service.js`                                                         | Proses wajib penanggung jawab                  |
| `server/src/modules/members/members.service.js`                                                          | Cari calon Penindak, undang lewat userId       |

## Perubahan Database

Tidak ada.

## Endpoint Baru

| Method | Path                                    | Auth  | Keterangan                                     |
| ------ | --------------------------------------- | ----- | ---------------------------------------------- |
| POST   | `/api/me/reports/claim`                 | Login | Pindahkan laporan tamu di browser ini ke akun  |
| GET    | `/api/boards/:slug/handlers/candidates` | OWNER | Cari akun untuk diundang lewat nama atau email |

Perubahan kontrak di `docs/API.md`:

- `GET /api/me/reports` menerima `q`.
- Laporan milik sendiri menambah `trackingCode`.
- `POST /api/reports/:id/process` wajib menghasilkan penanggung jawab.
- `POST /api/boards/:slug/handlers` menerima `userId`.

## Cara Menguji Manual

1. Masuk sebagai Admin, buka Panel Admin, klik Keluar. Kamu kembali ke Beranda tanpa popup. Masuk sebagai user biasa: tidak dialihkan ke Panel Admin.
2. Sebagai tamu, kirim laporan, lalu daftar atau masuk di browser yang sama. Muncul pesan bahwa laporan tamu pindah ke Laporan Saya. Laporan itu tampil dengan Kode Lacaknya.
3. Di Laporan Saya, cari dengan kata kunci atau `TND-XXXXXXXX`.
4. Sebagai Penindak, tombol Proses nonaktif sampai penanggung jawab dipilih. Di Tandai Selesai, kirim tanpa catatan: error muncul di kolom. Tambah foto dua kali: semua foto bertambah.
5. Di Pengaturan Board, tambah kategori "a": error di bawah kolom. Ketik nama di kolom undangan: daftar saran muncul.
6. Buka Board sebagai Penindak Utama: badge emas di atas nama, Dashboard dan Pengaturan di menu titik tiga.
7. Buka laporan Selesai, Ditolak, dan Duplikat: keterangan kunci hijau, merah, dan abu-abu.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 23 file, 419 tes lolos. Client 26 file, 104 tes lolos.
- Cek di browser (1280 px dan 390 px) dengan data demo: halaman Board, kartu, pengaturan, keterangan kunci, dan Laporan Saya. Tidak ada scroll horizontal.

## Keputusan dan Alasan

- **Laporan tamu yang dipindahkan tetap anonim.** Pelapor tidak pernah setuju namanya ditampilkan saat melapor sebagai tamu.
- **Email di daftar saran undangan disamarkan.** Ini mencegah Penindak Utama mengumpulkan email orang lain lewat pencarian nama.
- **Proses tanpa penanggung jawab ditolak juga di server.** Aturan ini tidak bisa dilewati lewat API.

## Hal yang Belum Selesai

- Tidak ada.

## Catatan untuk Fase Berikutnya

- Jangan andalkan `cn` untuk menimpa class Tailwind yang bertentangan. `cn` hanya menggabungkan string.
