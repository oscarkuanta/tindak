# Laporan Fase 11B: Data Demo, QA, Deploy (Frontend)

- Branch: `chore/f11b-release-ui`
- Pemilik: Akmal (2026-10-07), dilanjutkan Oscar (2026-10-08)
- Tanggal: 2026-10-07, lanjutan 2026-10-08
- PR: [#32 (draft)](https://github.com/oscarkuanta/tindak/pull/32)

## Ringkasan

Fase ini menyiapkan bagian UI rilis T!indak melalui pemeriksaan browser berbasis data demo, pengisian seluruh kolom Tampilan di checklist, penyediaan enam screenshot, dan penyempurnaan panduan demo. QA menemukan tabel kandidat verifikasi terlalu lebar di desktop dan header meluber di mobile; keduanya diperbaiki. Beranda, Board, Lapor, dan Lacak sudah diperiksa pada 375px tanpa overflow horizontal. Beberapa alur role, pengiriman laporan yang memerlukan CAPTCHA, uji realtime dua profil, tangkapan langsung 1280px, dan latihan penuh naskah demo masih tertunda.

## Yang Dikerjakan

- Memeriksa halaman beranda, pencarian Board, Board dan laporan, antrean, Dashboard Penindak, Dashboard Verifikasi, Panel Admin, pengaturan akun, rating, notifikasi, follow, dukungan, reaksi, undangan, serta pembatasan hak akses.
- Menguji pembaruan realtime dalam dua tab pada satu profil browser untuk status Kode Lacak, badge Official, dan angka dukungan. Dua profil browser terpisah belum diuji.
- Memeriksa Beranda, Board, Lapor, dan Lacak pada lebar 375px; seluruh halaman tidak memiliki overflow horizontal dan widget Turnstile tampil pada form Lapor. Laporan tamu tidak dikirim.
- Membuat header dua baris pada layar kecil, memendekkan label tindakan, dan menjaga susunan desktop pada layar lebar.
- Mengurangi lebar minimum tabel antrean kandidat verifikasi dari `44rem` menjadi `40rem` agar seluruh tabel muat pada desktop 1280px tanpa scroll horizontal.
- Mengisi semua sel kolom Tampilan pada `docs/QA-CHECKLIST.md` dengan ✅ atau ❌. U4 mencatat bahwa uji realtime memakai dua tab dalam satu profil.
- Menambahkan instruksi keamanan reset database demo ke naskah demo: `--reset` hanya boleh dijalankan pada database demo sekali pakai.
- Memformat `ui-reference.html` di root repo sesuai permintaan terpisah sebelumnya. Commit ini dipisahkan dari perubahan Fase 11B karena file itu menyebabkan Prettier gagal pada branch `dev`; catatan hasil lint terkait juga diperbarui di laporan Fase 10B.
- Menyimpan enam screenshot bernama sesuai README. Berkas PNG berukuran 1280 × 999; tangkapan sumber disesuaikan ke lebar 1280 dari viewport browser lokal yang lebih kecil, jadi belum menggantikan tangkapan langsung dengan viewport 1280px.
- Database demo sebelumnya dijalankan pada database lokal terpisah `tindak_demo_f11b`, bukan database utama. Data seed mencakup 45 akun, 8 Board, dan 81 laporan; perubahan manual dibersihkan dengan seed ulang. Proses server dan database lokal sudah tidak aktif pada pemeriksaan akhir.

## File Penting

| File                                                                                                      | Keterangan                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `client/src/app/layouts/Header.jsx`                                                                       | Mengatur ulang header responsif agar kontrol tidak meluber pada 375px.                                     |
| `client/src/pages/verification/VerificationDashboardPage.jsx`                                             | Mengurangi lebar minimum tabel kandidat.                                                                   |
| `docs/QA-CHECKLIST.md`                                                                                    | Mengisi semua hasil tampilan dan memberi catatan cakupan uji realtime U4.                                  |
| `docs/DEMO-SCRIPT.md`                                                                                     | Menjelaskan risiko `--reset` dan batasan database demo.                                                    |
| `docs/screenshots/beranda.png`, `board.png`, `kanban.png`, `verifikasi.png`, `admin.png`, `statistik.png` | Enam screenshot untuk README.                                                                              |
| `ui-reference.html`, `docs/reports/fase-10b-dashboard.md`                                                 | Cleanup format yang diminta sebelumnya dan catatan lint yang diperbarui; disimpan sebagai commit terpisah. |
| `docs/PROGRESS.md`                                                                                        | Status Fase 11B.                                                                                           |

## Perubahan Database

Tidak ada perubahan skema. Data uji berada pada database demo lokal terpisah dan tidak masuk commit.

## Endpoint Baru

Tidak ada. Tidak ada perubahan kontrak API.

## Cara Menguji Manual

1. Siapkan database kosong khusus demo, lalu jalankan `npm run db:deploy` dan `npm run db:seed:demo`.
2. Jalankan `npm run dev` dan masuk dengan akun dari `docs/DEMO.md`.
3. Ikuti `docs/DEMO-SCRIPT.md` untuk memeriksa alur tamu, Penindak, Admin Board, dan Admin.
4. Uji tampilan pada lebar 375px (sudah diperiksa pada fase ini), ambil screenshot dari viewport langsung 1280px, dan uji realtime memakai dua profil browser terpisah.
5. Untuk laporan tamu, selesaikan CAPTCHA secara manual sebelum mengirim. Jangan gunakan `--reset` pada database utama.

## Hasil Tes

- `npm run lint`: lolos, status keluar 0.
- `npm run build`: lolos. Vite memberi peringatan bundle JavaScript utama sekitar 1,48 MB setelah minifikasi dengan Turnstile test key di `.env`, di atas batas saran 500 kB.
- `npm run test -w client`: 23 file dan 85 tes lolos saat dijalankan dengan izin membaca file sementara Windows.
- `npm test`: 23 file server dan 408 tes server lolos; 23 file frontend dan 85 tes frontend lolos. Tes lokal memakai database terpisah `tindak_test` di XAMPP MariaDB 10.4.32.
- CI GitHub PR #32: semua job workflow lulus untuk commit `2ec61b3`, termasuk migrasi database tes, tes server/client, lint, dan build.
- Uji browser di 375px: Beranda, Board, Lapor, dan Lacak tidak meluber melewati lebar viewport; Turnstile tampil di Lapor.

## Keputusan dan Alasan

- Perubahan visual dibatasi pada tabel kandidat verifikasi yang ditemukan terlalu lebar saat QA; tidak ada endpoint, backend, Prisma, atau shared yang diubah.
- Header memakai susunan dua baris di mobile, label ringkas untuk tombol, dan tetap satu baris pada breakpoint desktop.
- Commit terpisah merapikan `ui-reference.html`, sesuai permintaan yang sudah diberikan sebelumnya. File ini menjadi pengecualian dari batas folder Fase 11B karena pemeriksaan lint repo mencakupnya dan `dev` awal gagal pada formatnya.
- Kolom checklist tetap memakai ✅/❌ untuk semua baris sesuai permintaan. Baris yang hanya diuji sebagian dijelaskan dalam sel atau bagian ini, agar tanda tersebut tidak menyatakan bahwa semua kombinasi sudah tercakup.
- Screenshot PNG disiapkan dengan ukuran lebar 1280px, tetapi dicatat bahwa sumbernya bukan viewport browser langsung 1280px.

## Lanjutan 2026-10-08 (Oscar)

Branch ini dibuat sebelum redesign Fase 12 masuk ke `dev`, sehingga PR #32 konflik dan screenshot-nya masih tampilan lama. Pekerjaan yang tersisa diselesaikan di branch yang sama.

### Konflik dan kebersihan repo

- `dev` (berisi Fase 10B, referensi desain, dan redesign Fase 12) digabung ke branch ini. `Header.jsx` memakai versi Fase 12, karena header lama dua baris dari Fase 11B sudah digantikan header baru dengan navigasi bawah di HP. `PROGRESS.md` digabung dan dirapikan: 2B–5B (#14–#17), 10B (#31), dan 11A (#29) ternyata sudah di-merge, jadi statusnya diubah menjadi Selesai.
- Salinan ganda `ui-reference.html` di root dihapus. Rujukan tunggal sekarang `docs/design/ui-reference.html` (isinya identik).
- Soal "staging": tidak ada server staging. GitHub tidak punya environment maupun deployment. Pemeriksaan sebelumnya memakai database demo lokal di laptop (`tindak_demo_f11b`).

### QA browser setelah redesign

Seluruh baris yang sebelumnya ❌ diuji ulang di browser dengan data demo, memakai Chrome headless yang dikendalikan lewat Chrome DevTools Protocol. Setiap akun memakai profil browser terpisah, jadi realtime benar-benar diuji antar-profil, bukan antar-tab. Hasil penting juga dicocokkan dengan isi database. Semua lolos (rincian di `docs/QA-CHECKLIST.md`, tanda **✅ 8 Okt**):

- Tamu: lapor dengan foto dan captcha, Kode Lacak, status Lacak berubah tanpa refresh, konfirmasi Sudah Beres.
- User: lapor anonim, tandai pelanggaran laporan dan Board, lonceng notifikasi, jawab Perlu Info, Belum Beres, buat Board, dukungan realtime antar-profil.
- Penindak Utama dan Penindak: kanban realtime, Proses, Minta Info, Tolak dengan alasan, Duplikat, Tandai Selesai dengan foto, undang, terima undangan, cabut, alihkan kepemilikan, tidak bisa memberi rating Board sendiri, notifikasi Penindak.
- Admin: Pulihkan, Hapus + Ban, peringatan pencabutan Official, bekukan Board palsu, cabut ban, cari user, audit log.
- Admin Board: Cabut Official menolak alasan pendek.

### Bug yang ditemukan dan diperbaiki

- **Halaman meluber ke samping di HP dan tablet** (bisa digeser horizontal):
  - Masuk dan Lapor: lingkaran hiasan `.blobs` diletakkan di luar wadah. Diperbaiki dengan `overflow-x: clip` pada `.blobs`.
  - Dashboard Statistik: tabel laporan terlambat dan paling lama (lebar 38rem) melebarkan item grid induknya. Diperbaiki dengan `min-w-0` pada section tabel.
  - Cari Board: kotak pilihan kota melebar mengikuti nama kota terpanjang. Diperbaiki dengan `w-full min-w-0`.
  - Panel Admin: kotak pilihan alasan lebih lebar 7px dari layar. `SELECT_CLASS` diberi `max-w-full`.
  - Setelah perbaikan, 13 halaman di 390px dan 768px tidak lagi meluber dan tidak ada error console.
- **Logo putih hampir tak terlihat di halaman Masuk dan Daftar** (latar mint pucat). `Logo` sekarang punya `tone`; layout autentikasi memakai `brand` (`mint-600`), sesuai referensi desain.
- **Font diblokir CSP di production** (bug backend). Diperbaiki terpisah di branch `fix/f11-csp-fonts`. Sudah diverifikasi di server mode production: tanpa perbaikan tidak ada font yang termuat; dengan perbaikan Poppins dan Montserrat termuat.

### Screenshot

Enam screenshot README diambil ulang dari tampilan baru dengan viewport langsung 1280 × 900, dari data demo yang baru diisi ulang.

## Hal yang Belum Selesai

- Ukuran bundle JavaScript sekitar 1,49 MB (peringatan Vite). Tidak memblokir rilis, tetapi halaman Admin, Verifikasi, dan Dashboard bisa dimuat belakangan (`React.lazy`) agar halaman pertama lebih cepat.
- Di lebar 1280px, teks pilihan filter antrean terpotong ("Semua kategor…"). Hanya kosmetik.
- Pemeriksaan lintas browser baru Chrome (dan Brave dari Fase 12). Edge dan Firefox belum dicoba.
- Login Google belum dikonfigurasi, jadi tombolnya belum diuji dengan akun sungguhan.
- Latihan naskah demo secara manual oleh orang yang akan merekam video.

## Catatan untuk Fase Berikutnya

- Sebelum presentasi, pulihkan database demo terisolasi, jalankan ulang seed, dan ikuti langkah uji yang belum selesai di atas.
- Jika CI memberi bukti lint, tes server/client, dan build hijau, catat hasilnya pada PR. Jangan mengubah scope backend untuk menyelesaikan bug yang ditemukan; laporkan kepada Oscar.
