# Laporan Fase 16: Perbaikan Bug dan UI/UX Lanjutan

- Branch: `fix/f16-bug-uiux`
- Pemilik: Oscar
- Tanggal: 2026-10-08
- PR: (diisi setelah PR dibuat)

## Ringkasan

Fase ini mengumpulkan perbaikan bug dan UI/UX dari testing lanjutan setelah Fase 15, dalam satu branch, supaya tidak bolak-balik merge.

## Yang Dikerjakan

- **Menu titik tiga di kartu laporan tidak lagi terpotong.** Kartu laporan memakai `overflow-hidden` untuk membulatkan sudut foto, sehingga menu "Tandai Pelanggaran" ikut terpotong. Sekarang sudut membulat dipasang di foto, dan kartu tidak memotong isinya.
- **Kolom kota bisa diketik ulang.** Sebelumnya kolom selalu menampilkan kota yang sudah dipilih, sehingga hurufnya tidak bisa dihapus. Sekarang kolom menampilkan teks yang diketik, semua teks terpilih saat kolom diklik, dan ada tombol "Batal, tetap di {kota}".
- **Panel kanan menjadi "Board di Sekitarmu".**
  - Isinya hanya Board di kota pilihan user, tidak pernah diisi Board populer dari kota lain.
  - Kota tanpa Board menampilkan "Belum ada Board di {kota}" dengan ajakan membuat Board.
  - Jika user belum memilih kota, panel mengajak memilih kota.
  - Panel tampil di Beranda untuk semua role, termasuk user yang sudah mengikuti Board.
- **Saran di kolom cari header** menampilkan Board di kota user sebelum user mengetik, bukan Board terpopuler secara nasional.
- Hook `usePopularBoards` yang tidak lagi dipakai dihapus.

## File Penting

| File                                           | Keterangan                             |
| ---------------------------------------------- | -------------------------------------- |
| `client/src/components/reports/ReportCard.jsx` | Kartu tidak memotong menu              |
| `client/src/components/boards/CitySelect.jsx`  | Kolom kota mengikuti teks yang diketik |
| `client/src/pages/home/HomePage.jsx`           | Tombol batal ganti kota                |
| `client/src/app/layouts/RightSidebar.jsx`      | Panel Board di Sekitarmu               |
| `client/src/app/layouts/BoardSearch.jsx`       | Saran kolom cari memakai kota user     |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada. Tidak ada perubahan kontrak API.

## Cara Menguji Manual

1. Buka halaman Board, klik titik tiga di kartu laporan. Menu "Tandai Pelanggaran" tampil utuh di desktop dan HP.
2. Di Beranda, pilih Kota Surabaya. Panel kanan menampilkan Board di Surabaya. Klik Ganti kota, hapus teksnya, ketik "aceh", lalu pilih Kabupaten Aceh Besar. Panel kanan menampilkan "Belum ada Board di Kabupaten Aceh Besar."
3. Ulangi langkah 2 setelah login sebagai user biasa dan Admin.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 23 file, 413 tes lolos. Client 26 file, 94 tes lolos.
- Cek di browser: alur ganti kota diuji sebagai tamu, user biasa, dan Admin. Menu titik tiga dicek di lebar 1280 px dan 390 px.

## Keputusan dan Alasan

- Panel kanan memakai `GET /api/boards/search` dengan filter kota, sehingga tidak perlu endpoint baru. Di dalam satu kota, urutannya tetap dari Board yang paling aktif.

## Hal yang Belum Selesai

- Branch ini akan dilanjutkan dengan perbaikan lain sebelum dibuat PR.

## Catatan untuk Fase Berikutnya

- Endpoint `GET /api/boards/popular` masih ada di server, tetapi tidak lagi dipakai client.
