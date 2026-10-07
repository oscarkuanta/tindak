# Laporan Fase 12: Redesign UI

- Branch: `feat/f12-redesign-ui`
- Pemilik: Akmal
- Tanggal: 2026-10-07
- PR: Belum dibuat; GitHub menolak push dengan `Internal Server Error`.

## Ringkasan

Frontend T!indak diperbarui agar mengikuti design system pada `ui-reference.html`: palet mint dan teal, Poppins dan Montserrat, kartu berbayang lembut, badge dan chip berwarna, navigasi responsif, serta tata letak desktop, tablet, dan mobile. Kode aplikasi berubah di `client/`, disertai laporan/progres fase, penambahan library pada lockfile root, dan pemformatan file referensi root. Tidak ada perubahan pada `server/`, `shared/`, API, route, query key, hook data, validasi, atau alur form.

## Yang Dikerjakan

- Memindahkan warna, font, radius, bayangan, dan ukuran layout ke token CSS dan Tailwind v4 `@theme` di `client/src/index.css`.
- Menata ulang header, pencarian, navigasi kiri, sidebar, layout autentikasi, layout Board, logo, notifikasi, dan navigasi bawah mobile.
- Menata tombol, input, select, textarea, kartu, badge verifikasi, badge kepercayaan, chip status dan bahaya, tab pil, serta kartu statistik.
- Menerapkan gaya ke Beranda, detail Board, buat Board, buat laporan, antrean Penindak, detail dan lacak laporan, laporan terkirim, dashboard statistik, dashboard dan detail verifikasi, serta layout dan halaman Panel Admin.
- Halaman pencarian Board, Board Saya, Board Diikuti, Pengaturan Board, Laporan Saya, Notifikasi, Profil, Undangan, Kode Lacak perangkat, autentikasi, placeholder, dan 403/404 ikut memakai gaya baru melalui layout dan komponen bersama.
- Menambahkan `lucide-react` untuk ikon outline React dan memindahkan warna logo Google ke token CSS.
- Merapikan format file referensi `ui-reference.html`; konten referensi tidak diubah.

## File Penting

| File                                           | Keterangan                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `client/src/index.css`                         | Token design system dan layout responsif                                            |
| `client/src/app/layouts/`                      | Header, sidebar, layout, logo, dan navigasi mobile                                  |
| `client/src/components/ui/`                    | Komponen dasar, chips, tabs, dan StatCard                                           |
| `client/src/components/boards/BoardBadges.jsx` | Badge Official, Komunitas, dan Trust                                                |
| `client/src/pages/`                            | Penyegaran tampilan halaman utama, Board, laporan, statistik, verifikasi, dan admin |
| `client/package.json`, `package-lock.json`     | Dependensi ikon `lucide-react`                                                      |
| `ui-reference.html`                            | Format ulang tanpa perubahan konten                                                 |
| `docs/PROGRESS.md`                             | Status fase redesign                                                                |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada endpoint baru dan tidak ada perubahan kontrak di `docs/API.md`.

| Method | Path | Auth | Keterangan                   |
| ------ | ---- | ---- | ---------------------------- |
| —      | —    | —    | Tidak ada perubahan endpoint |

## Cara Menguji Manual

1. Jalankan `npm run dev` dari root proyek.
2. Buka Beranda, detail Board, detail laporan, formulir laporan, antrean, dashboard statistik, verifikasi, dan Panel Admin.
3. Ulangi pada lebar 1280px, 768px, dan 390px. Pastikan navigasi bawah muncul pada mobile dan tidak ada scroll horizontal pada body.
4. Periksa antrean dan tabel pada wadah gulirnya sendiri, serta tombol, badge Official/Komunitas/Trust, chip status dan bahaya, tab, dan kartu statistik.

## Hasil Tes

- `npm run lint`: lulus, exit code 0.
- `npm run test -w client -- --pool=vmThreads --fileParallelism=false`: 23 file lulus, 85 tes lulus.
- `npm run build`: lulus. Bundel JavaScript minified sekitar 1.49 MB memunculkan peringatan ukuran chunk dari Vite.
- `npm test` root: setup tes backend tidak dapat menyambung ke MySQL lokal di `127.0.0.1:3306` untuk database `tindak_test`; tidak ada perubahan server atau database.
- Pemeriksaan visual manual di Chrome, Firefox, Edge pada tiga ukuran belum dapat dilakukan. Browser yang tersedia tidak dapat menjangkau server lokal, dan Chrome, Firefox, serta Edge tidak tersedia di sesi browser ini.

## Keputusan dan Alasan

- Konfigurasi token memakai `@theme static` karena proyek memakai Tailwind CSS v4 dan tidak memiliki konfigurasi `tailwind.config` aktif.
- `lucide-react` dipilih sebagai satu library ikon karena menyediakan ikon outline berbentuk komponen React.
- API Beranda tidak menyediakan ringkasan “Minggu ini”. Kartu Beranda memakai hitungan laporan dan dukungan dari data feed yang sedang ditampilkan, tanpa membuat angka mingguan palsu.
- Tidak ada route Lupa Password pada router saat ini. Route atau alur baru tidak ditambahkan karena fase ini melarang perubahan routing.

## Hal yang Belum Selesai

- Pemeriksaan visual lintas browser dan resolusi perlu dilakukan manual setelah aplikasi dapat dibuka di Chrome, Firefox, dan Edge.
- Tes seluruh workspace memerlukan MySQL test lokal yang aktif. Tes seluruh frontend sudah berjalan dan lulus.
- Peringatan ukuran chunk build belum ditangani karena pemecahan bundel berada di luar pekerjaan penyegaran tampilan ini.

## Catatan untuk Fase Berikutnya

- Pertimbangkan endpoint ringkasan Beranda bila produk memerlukan metrik mingguan.
- Jalankan kembali pemeriksaan visual dan `npm test` pada lingkungan yang menyediakan tiga browser dan MySQL test.
