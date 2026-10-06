# Laporan Fase 4A: Laporan dan Tamu (Backend)

- Branch: `feat/f4a-reports`
- Pemilik: Oscar
- Tanggal: 2026-10-06
- PR: ke `dev`

## Ringkasan

Tamu dan user login sekarang bisa mengirim laporan dengan foto ke Board, lengkap dengan Kode Lacak, captcha Cloudflare Turnstile, batas laporan per perangkat/akun/jaringan, penghapusan EXIF, dan scan foto tidak pantas. Feed laporan di halaman Board, detail laporan, halaman Lacak, dan Laporan Saya buatan frontend 4B dan 5B sudah berjalan dengan data asli. Frontend tidak diubah.

## Yang Dikerjakan

- Model `Report`, `ReportMedia`, `ReportEvent` (timeline) dan 4 enum.
- Upload multer (memori, maks 4 foto, 5 MB) dengan cek tanda tangan file JPEG/PNG/WebP dari isi file.
- Pemrosesan sharp: putar sesuai orientasi, hapus semua metadata (EXIF/GPS), resize maks 1600 px, simpan WebP bernama acak lewat modul `storage`.
- Scan NSFW (nsfwjs) di satu modul dengan `NSFW_ENABLED`: skor di atas 0,7 ditolak 422, 0,4 sampai 0,7 diburamkan dan laporan ditandai `needsModeration` untuk Fase 7.
- Verifikasi Turnstile di server. Kunci test resmi Cloudflare dikenali tanpa internet. Production menolak start tanpa key asli.
- Cookie tamu `tindak.gt` (httpOnly, 1 tahun, hanya hash yang disimpan), hash IP dengan HMAC.
- Batas laporan dari tabel `Report`: tamu 3/hari per perangkat + jeda 2 menit, user 5/hari + jeda 1 menit, 30/hari per jaringan. Pesan 429 menyebut kapan bisa lapor lagi.
- `isBanned` sebagai titik sambung Fase 7 (selalu lolos).
- 5 endpoint laporan. Detail sudah berisi field Fase 5 dengan nilai awal (`allowedActions: []`, `infoRequest: null`, `parent: null`, `timeline`) supaya halaman 5B tidak rusak.
- `activeReportCount` asli di Board (dan dipakai urutan pencarian), serta penolakan hapus kategori yang sudah dipakai laporan (`409 CATEGORY_IN_USE`).
- Seed 5 laporan contoh dengan foto, termasuk laporan tamu yang bisa dilacak di `/lacak/DEMAK234?secret=rahasia-demo-tindak`.

## File Penting

| File                                              | Keterangan                                                |
| ------------------------------------------------- | --------------------------------------------------------- |
| `server/prisma/schema.prisma`                     | `Report`, `ReportMedia`, `ReportEvent`, enum laporan      |
| `server/src/modules/reports/reports.service.js`   | Alur kirim laporan, daftar, detail, lacak, laporan saya   |
| `server/src/modules/reports/reports.presenter.js` | Bentuk `Report` dan `Report detail`, `isOverdue`          |
| `server/src/modules/reports/reportQuota.js`       | Batas dan jeda laporan                                    |
| `server/src/modules/reports/reports.routes.js`    | Route laporan, lacak, laporan saya                        |
| `server/src/lib/images.js`                        | Deteksi jenis file dan pemrosesan sharp                   |
| `server/src/lib/storage.js`                       | Simpan dan hapus file (ganti di sini untuk cloud storage) |
| `server/src/lib/nsfw.js`                          | Scan NSFW dan ambang skor                                 |
| `server/src/lib/turnstile.js`                     | Verifikasi captcha                                        |
| `server/src/lib/bans.js`                          | `isBanned` (diisi Fase 7)                                 |
| `server/src/middlewares/guestToken.js`            | Cookie `tindak.gt`                                        |
| `server/src/middlewares/upload.js`                | Konfigurasi multer dan pesan error foto                   |
| `server/src/utils/crypto.js`                      | `sha256`, `hashIp`, `randomToken`, perbandingan aman      |
| `server/src/utils/trackingCode.js`                | Pembuat Kode Lacak                                        |
| `shared/src/schemas/reports.js`                   | Skema request laporan, daftar, lacak                      |

## Perubahan Database

Migrasi `20261006022527_add_reports`:

- `reports`: semua kolom dari prompt, ditambah `needs_moderation`. `tracking_code` unik `CHAR(8)`. Hash disimpan sebagai `CHAR(64)`. Index untuk daftar Board (`board_id`, `is_hidden`, `created_at`), status, dan perhitungan batas (`user_id` / `guest_token_hash` / `ip_hash` + `created_at`).
- `report_media`: ditambah `storage_key` untuk menghapus file.
- `report_events`: timeline (`from_status`, `to_status`, `actor_type`, `actor_id`, `reason`, `note`). Setiap laporan langsung punya entri "Laporan dibuat", jadi 5A tinggal menambah entri.
- Relasi: kategori tidak bisa dihapus jika dipakai laporan (`RESTRICT`), laporan ikut terhapus jika Board dihapus, dan user yang dihapus membuat `user_id` menjadi null.

## Endpoint Baru

| Method | Path                        | Auth            | Keterangan                |
| ------ | --------------------------- | --------------- | ------------------------- |
| POST   | `/api/boards/:slug/reports` | Opsional        | Kirim laporan (multipart) |
| GET    | `/api/boards/:slug/reports` | Publik          | Feed laporan Board        |
| GET    | `/api/reports/:id`          | Opsional        | Detail laporan            |
| GET    | `/api/track/:code?secret=`  | Publik + secret | Lacak laporan             |
| GET    | `/api/me/reports`           | Login           | Laporan saya              |
| GET    | `/api/uploads/:file`        | Publik          | Foto laporan (statis)     |

Perubahan `docs/API.md`: bagian Fase 4 ditulis ulang lengkap (field, batas, urutan pengecekan, kode error, bentuk detail). Ditambah `CATEGORY_IN_USE` di hapus kategori.

## Perbedaan dengan Prompt

| Prompt                                                   | Yang dibuat                      | Alasan                                                                                                                                                                                                                 |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foto di `/uploads`                                       | `/api/uploads`                   | Proxy Vite hanya meneruskan `/api`, dan helmet memblokir gambar dari port lain. Dengan `/api/uploads`, foto tampil di frontend tanpa mengubah `client/`                                                                |
| `@tensorflow/tfjs-node`                                  | `@tensorflow/tfjs`               | `tfjs-node` gagal di-install di Windows (butuh unduhan dan kompilasi pustaka native). Versi JavaScript murni memberi hasil yang sama, lebih lambat (sekitar 1 detik per foto), tapi aman untuk semua laptop tim dan CI |
| `dangerSlaHours`                                         | `Board.dangerousTargetHours`     | Nama dari Fase 2A                                                                                                                                                                                                      |
| Kategori dipakai "diarsipkan" (catatan lama di `API.md`) | Ditolak `409 CATEGORY_IN_USE`    | Sesuai prompt 4A, dan tidak butuh perubahan tampilan frontend                                                                                                                                                          |
| TODO di kode                                             | Fungsi `isBanned` yang dipanggil | Aturan tim: kode tanpa komentar                                                                                                                                                                                        |

## Cara Menguji Manual

```bash
git pull
npm install
npm run db:migrate
npm run db:seed
```

Pastikan `.env` berisi `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (kunci test). Tanpa ini, widget captcha di form tidak muncul dan laporan tidak bisa dikirim. Lalu `npm run dev`.

1. **Feed**: buka `http://localhost:5173/b/jalan-rungkut-madya-surabaya`. Tiga laporan contoh tampil dengan foto, label bahaya, dan status.
2. **Lacak**: buka `http://localhost:5173/lacak/DEMAK234?secret=rahasia-demo-tindak`. Detail, foto, dan riwayat "Laporan dibuat" tampil.
3. **Kirim sebagai tamu**: keluar dari akun, buka Board, klik **Laporkan Masalah**, isi form, unggah 1 sampai 4 foto. Captcha test langsung menampilkan "Success!". Setelah kirim, halaman sukses menampilkan Kode Lacak.
4. **Batas**: langsung kirim lagi dari browser yang sama. Muncul pesan "Tunggu sebentar ... dalam 2 menit".
5. **Laporan Saya**: masuk sebagai `budi@tindak.test`, kirim laporan, lalu buka **Laporan Saya**.
6. **File bukan gambar**: ganti nama file teks menjadi `.jpg` lalu unggah. Muncul pesan "File harus berupa foto JPEG, PNG, atau WebP".
7. **Hapus kategori yang dipakai**: sebagai Budi, buka Pengaturan Jalan Rungkut Madya, lalu hapus kategori "Jalan Berlubang". Ditolak karena sudah dipakai laporan.
8. **EXIF**: unggah foto dari HP yang ada lokasinya, lalu unduh foto hasil dari halaman detail. Properti file tidak lagi berisi lokasi atau model kamera.

Contoh curl kirim laporan sebagai tamu (Git Bash):

```bash
curl -c jar.txt -b jar.txt -X POST http://localhost:5173/api/boards/kampus-its-sukolilo-surabaya/reports \
  -F "title=AC ruang baca mati" -F "categoryId=ID_KATEGORI" -F "severity=MEDIUM" \
  -F "locationDetail=Perpustakaan lantai 1" -F "description=AC mati sejak pagi, ruangan sangat panas." \
  -F "turnstileToken=XXXX.DUMMY.TOKEN.XXXX" -F "photos=@foto.jpg;type=image/jpeg"
curl "http://localhost:5173/api/track/KODE?secret=SECRET_DARI_trackingUrl"
```

Uji manual yang sudah dilakukan: feed Board (foto tampil lewat proxy), halaman Lacak `DEMAK234`, form lapor dengan widget Turnstile test ("Success!") di Chrome, serta kirim laporan multipart lewat proxy yang meniru `FormData` frontend (201, Kode Lacak, cookie `tindak.gt`). Pengiriman lewat tombol di browser belum dicoba karena alat otomasi browser tidak bisa memilih file dari komputer.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 190 tes lolos (10 file), client 40 tes lolos.
  - `reports.test.js` (22 tes): tamu sukses (cookie, anonim, Kode Lacak, `trackingUrl`, hash, `dueAt`, timeline, URL foto), EXIF terhapus dan WebP 1600 px (dicek dari file hasil) serta file bisa diambil di `/api/uploads`, PNG dan WebP, user anonim atau tidak, file bukan gambar, tanpa foto, 5 foto, di atas 5 MB, data tidak valid dan field asing, captcha gagal dan kosong, kategori Board lain, Board beku, NSFW ditolak (tanpa file tersisa) dan diburamkan (`needsModeration`); jeda tamu 2 menit, batas tamu 3/hari dengan perangkat lain tetap boleh, batas jaringan 30/hari, user jeda 1 menit dan 5/hari; feed (urutan, filter, `q`, pagination), laporan tersembunyi (publik 404, Penindak dan pelapor boleh), `reporterType` hanya untuk Penindak, `me/reports`, `activeReportCount`, `CATEGORY_IN_USE`; lacak dengan secret benar, format `TND-` huruf kecil, secret salah dan kode tidak dikenal 404 yang sama, secret kosong 400.
  - `reports.unit.test.js` (17 tes): Kode Lacak, deteksi jenis file, ambang NSFW, format waktu tunggu, `isOverdue`, hash IP, verifikasi Turnstile (kunci test, panggilan Cloudflare, 503 saat offline), dan env production.
  - NSFW dan Turnstile di-mock di tes integrasi.
- `npm run build`: lolos.

## Keputusan dan Alasan

- **Urutan pengecekan murah dulu**: Board, kategori, ban, batas, captcha, baru foto (sharp dan NSFW yang berat). File baru disimpan setelah semua lolos, dan dihapus lagi jika penyimpanan database gagal.
- **Batas tamu per perangkat** memakai hash cookie `tindak.gt` (sesuai PRODUCT.md "per perangkat"). Penyalahgunaan dengan menghapus cookie tetap tertahan oleh batas 30 per jaringan dan rate limit 10 per menit.
- **Pengecekan jenis file manual** (beberapa byte awal) daripada library tambahan. Sharp juga menolak file rusak.
- **Secret lacak** acak 24 byte, hanya hash SHA-256 yang disimpan, dibandingkan dengan `timingSafeEqual`. Kode tidak ada dan secret salah menghasilkan respons yang sama persis.
- **Model NSFW dimuat saat pertama dipakai**, bukan saat server start, supaya development dan tes tetap cepat.
- **Laporan tersembunyi tetap terlihat oleh pelapornya**, supaya pelapor tahu laporannya sedang ditinjau.

## Hal yang Belum Selesai

- Pelapor otomatis dihitung 1 dukungan (Fase 6), notifikasi laporan baru ke Penindak dan pengikut (Fase 9), urutan `hot` dan `priority` (Fase 6).
- Antrean moderasi yang memakai `needsModeration` dan `nsfwScore` (Fase 7), serta isi `isBanned` (Fase 7).
- Penyimpanan cloud untuk deploy (Fase 11, cukup mengganti `lib/storage.js`).
- Pembersihan otomatis `ipHash` setelah 90 hari (PRODUCT.md, Lapis 6) belum ada.
- Di database development Oscar ada 1 laporan uji "Uji kirim dari proxy" di Kampus ITS Sukolilo.

## Catatan untuk Fase Berikutnya

- **5A**: tambah entri `ReportEvent` di setiap perubahan status. `actorType` `HANDLER` / `REPORTER` / `SYSTEM` sudah ada. Isi `allowedActions`, `infoRequest`, dan `parent` di `toReportDetail`. Foto sesudah memakai `kind: 'AFTER'` lewat `saveFile` yang sama.
- **6**: urutan `hot` dan `priority` cukup diubah di `paginate` / `listBoardReports`. Kolom `priorityScore` sudah ada.
- **7**: isi `isBanned` di `lib/bans.js`. Antrean moderasi bisa memulai dari `Report.needsModeration` dan `ReportMedia.nsfwScore`.
- Tes yang membuat laporan: pakai helper `sendReport` dan `backdateReports` di `server/tests/reports.test.js` sebagai contoh. Untuk melewati jeda, mundurkan `createdAt`.
