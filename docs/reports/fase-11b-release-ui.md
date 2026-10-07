# Laporan Fase 11B: Data Demo, QA, Deploy (Frontend)

- Branch: `chore/f11b-release-ui`
- Pemilik: Akmal
- Tanggal: 2026-10-07
- PR: [#32 (draft)](https://github.com/oscarkuanta/tindak/pull/32)

## Ringkasan

Fase ini menyiapkan bagian UI rilis T!indak melalui pemeriksaan browser berbasis data demo, pengisian seluruh kolom Tampilan di checklist, penyediaan enam screenshot, dan penyempurnaan panduan demo. Pemeriksaan menemukan satu tabel kandidat verifikasi yang terlalu lebar; lebar minimumnya dikurangi. Pemeriksaan visual sudah mencakup alur utama, tetapi uji mobile 375px, beberapa alur role, CAPTCHA/laporan tamu, dan pengulangan naskah demo belum selesai karena server lokal tidak aktif pada pemeriksaan akhir.

## Yang Dikerjakan

- Memeriksa halaman beranda, pencarian Board, Board dan laporan, antrean, Dashboard Penindak, Dashboard Verifikasi, Panel Admin, pengaturan akun, rating, notifikasi, follow, dukungan, reaksi, undangan, serta pembatasan hak akses.
- Menguji pembaruan realtime dalam dua tab pada satu profil browser untuk status Kode Lacak, badge Official, dan angka dukungan. Dua profil browser terpisah belum diuji.
- Mengurangi lebar minimum tabel antrean kandidat verifikasi dari `44rem` menjadi `40rem` agar seluruh tabel muat pada desktop 1280px tanpa scroll horizontal.
- Mengisi semua sel kolom Tampilan pada `docs/QA-CHECKLIST.md` dengan ✅ atau ❌. U4 mencatat bahwa uji realtime memakai dua tab dalam satu profil.
- Menambahkan instruksi keamanan reset database demo ke naskah demo: `--reset` hanya boleh dijalankan pada database demo sekali pakai.
- Menyimpan enam screenshot bernama sesuai README. Berkas PNG berukuran 1280 × 999; tangkapan sumber disesuaikan ke lebar 1280 dari viewport browser lokal yang lebih kecil, jadi belum menggantikan tangkapan langsung dengan viewport 1280px.
- Database demo sebelumnya dijalankan pada database lokal terpisah `tindak_demo_f11b`, bukan database utama. Data seed mencakup 45 akun, 8 Board, dan 81 laporan; perubahan manual dibersihkan dengan seed ulang. Proses server dan database lokal sudah tidak aktif pada pemeriksaan akhir.

## File Penting

| File                                                                                                      | Keterangan                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `client/src/pages/verification/VerificationDashboardPage.jsx`                                             | Mengurangi lebar minimum tabel kandidat.                                  |
| `docs/QA-CHECKLIST.md`                                                                                    | Mengisi semua hasil tampilan dan memberi catatan cakupan uji realtime U4. |
| `docs/DEMO-SCRIPT.md`                                                                                     | Menjelaskan risiko `--reset` dan batasan database demo.                   |
| `docs/screenshots/beranda.png`, `board.png`, `kanban.png`, `verifikasi.png`, `admin.png`, `statistik.png` | Enam screenshot untuk README.                                             |
| `docs/PROGRESS.md`                                                                                        | Status Fase 11B.                                                          |

## Perubahan Database

Tidak ada perubahan skema. Data uji berada pada database demo lokal terpisah dan tidak masuk commit.

## Endpoint Baru

Tidak ada. Tidak ada perubahan kontrak API.

## Cara Menguji Manual

1. Siapkan database kosong khusus demo, lalu jalankan `npm run db:deploy` dan `npm run db:seed:demo`.
2. Jalankan `npm run dev` dan masuk dengan akun dari `docs/DEMO.md`.
3. Ikuti `docs/DEMO-SCRIPT.md` untuk memeriksa alur tamu, Penindak, Admin Board, dan Admin.
4. Uji tampilan pada lebar 1280px dan 375px serta realtime memakai dua profil browser terpisah.
5. Untuk laporan tamu, selesaikan CAPTCHA secara manual sebelum mengirim. Jangan gunakan `--reset` pada database utama.

## Hasil Tes

- `npm run lint`: lolos, status keluar 0.
- `npm run build`: lolos. Vite memberi peringatan bundle JavaScript utama sekitar 1,12 MB setelah minifikasi, di atas batas saran 500 kB.
- `npm run test -w client`: 23 file dan 85 tes lolos saat dijalankan dengan izin membaca file sementara Windows.
- `npm test`: belum lolos di lingkungan lokal. Tes server berhenti sebelum berjalan karena `.env.test` tidak tersedia; MySQL lokal tidak aktif pada port 3306. Percobaan `npm run test -w client` tanpa izin tambahan juga tidak dapat membuka file worker sementara sandbox, tetapi tes frontend berhasil pada percobaan dengan izin yang sesuai.
- Uji browser tidak dapat dilanjutkan setelah server demo berhenti; halaman lokal mengembalikan koneksi API terputus dan port aplikasi tidak menerima koneksi.

## Keputusan dan Alasan

- Perubahan visual dibatasi pada tabel kandidat verifikasi yang ditemukan terlalu lebar saat QA; tidak ada endpoint, backend, Prisma, atau shared yang diubah.
- Kolom checklist tetap memakai ✅/❌ untuk semua baris sesuai permintaan. Baris yang hanya diuji sebagian dijelaskan dalam sel atau bagian ini, agar tanda tersebut tidak menyatakan bahwa semua kombinasi sudah tercakup.
- Screenshot PNG disiapkan dengan ukuran lebar 1280px, tetapi dicatat bahwa sumbernya bukan viewport browser langsung 1280px.

## Hal yang Belum Selesai

- Jalankan ulang tes lengkap `npm test` dengan `.env.test` dan MySQL 8 khusus tes.
- Uji halaman Beranda, Board, Lapor, dan Lacak pada viewport langsung 375px serta ambil ulang enam screenshot pada viewport 1280px.
- Uji realtime dengan dua profil browser, bukan hanya dua tab dalam satu profil.
- Selesaikan uji laporan tamu dengan CAPTCHA secara manual, konfirmasi selesai oleh tamu, dan alur role lain yang bertanda ❌ di `docs/QA-CHECKLIST.md`.
- Latih naskah demo secara penuh di browser setelah server demo tersedia.

## Catatan untuk Fase Berikutnya

- Sebelum presentasi, pulihkan database demo terisolasi, jalankan ulang seed, dan ikuti langkah uji yang belum selesai di atas.
- Jika CI memberi bukti lint, tes server/client, dan build hijau, catat hasilnya pada PR. Jangan mengubah scope backend untuk menyelesaikan bug yang ditemukan; laporkan kepada Oscar.
