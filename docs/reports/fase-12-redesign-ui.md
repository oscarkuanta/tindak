# Laporan Fase 12: Redesign UI

- Branch: `feat/f12-redesign-ui`
- Pemilik: Akmal
- Tanggal: 2026-10-08
- PR: [#33](https://github.com/oscarkuanta/tindak/pull/33)

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

- `npm run lint`: lulus, exit code 0, setelah ambang breakpoint mobile diperbaiki.
- `npm run build`: lulus. Bundel JavaScript minified sekitar 1.49 MB memunculkan peringatan ukuran chunk dari Vite.
- `npm run test -w client -- --pool=threads --maxWorkers=1 --reporter=dot`: 23 file dan 85 tes lulus setelah perubahan breakpoint.
- `npm test` root lokal gagal saat Vitest memuat tes backend karena file sementara SSR tidak ditemukan (`ENOENT`). Pengulangan backend dengan satu worker tidak menghasilkan keluaran dan dihentikan setelah macet. Belum ada perubahan backend atau database.
- GitHub Actions untuk [PR #33](https://github.com/oscarkuanta/tindak/pull/33) pada commit sebelum perubahan breakpoint: lint, migrasi database tes, `npm test`, dan build lulus. CI perlu dijalankan lagi setelah perubahan lokal dikirim.

## Pemeriksaan Visual Manual

- Beranda diperiksa melalui Brave dari screenshot pada lebar 1280px, 768px, dan 390px. Terlihat layout desktop dengan tiga area pada lebar desktop, layout tablet pada 768px, dan header ringkas serta bottom navigation pada 390px. Tidak tampak scroll horizontal pada screenshot tersebut.
- Breakpoint disetel ke `max-width: 759px`, sehingga lebar 760px tetap memakai layout tablet sesuai instruksi “mobile di bawah 760px”.
- Console menampilkan `401` dari `GET /api/auth/me` saat pengguna belum login. Ini respons yang ditentukan kontrak `docs/API.md`; `getMe` menangkap status tersebut dan menganggap sesi sebagai tamu.
- Halaman lain sebelumnya sudah dibuka dengan data demo untuk pemeriksaan alur dan komponen, tetapi belum semuanya diperiksa pada tiga lebar.
- Hanya Brave tersedia untuk pemeriksaan manual. Chrome, Firefox, dan Edge tidak tersedia, jadi pemeriksaan lintas browser belum terverifikasi.

## Keputusan dan Alasan

- Konfigurasi token memakai `@theme static` karena proyek memakai Tailwind CSS v4 dan tidak memiliki konfigurasi `tailwind.config` aktif.
- `lucide-react` dipilih sebagai satu library ikon karena menyediakan ikon outline berbentuk komponen React.
- API Beranda tidak menyediakan ringkasan “Minggu ini”. Kartu Beranda memakai hitungan laporan dan dukungan dari data feed yang sedang ditampilkan, tanpa membuat angka mingguan palsu.
- Tidak ada route Lupa Password pada router saat ini. Route atau alur baru tidak ditambahkan karena fase ini melarang perubahan routing.

## Hal yang Belum Selesai

- Pemeriksaan visual setiap halaman pada tiga resolusi dan lintas browser masih perlu dilengkapi. Screenshot yang tersedia hanya cukup untuk memastikan responsivitas Beranda di Brave.
- Pengulangan tes lokal setelah perubahan breakpoint terhambat oleh error file sementara Vitest dan proses test yang macet. CI perlu mengonfirmasi ulang commit terbaru.
- Peringatan ukuran chunk build belum ditangani karena pemecahan bundel berada di luar pekerjaan penyegaran tampilan ini.

## Catatan untuk Fase Berikutnya

- Pertimbangkan endpoint ringkasan Beranda bila produk memerlukan metrik mingguan.
- Jalankan kembali pemeriksaan visual halaman lain dan lintas browser pada lingkungan yang menyediakan browser tersebut.
