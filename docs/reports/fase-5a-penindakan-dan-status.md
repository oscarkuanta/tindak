# Laporan Fase 5A: Penindakan dan Status (Backend)

- Branch: `feat/f5a-handling`
- Pemilik: Oscar
- Tanggal: 2026-10-06
- PR: ke `dev`

## Ringkasan

Laporan sekarang bisa dibawa dari Baru sampai Selesai: Penindak memproses, meminta info, menolak, menandai duplikat, dan menandai selesai dengan foto sesudah. Pelapor, baik login maupun tamu dengan Kode Lacak, menjawab pertanyaan dan mengonfirmasi hasilnya. Aturan status ada di `shared` dan dipakai server serta frontend. Job terjadwal mengonfirmasi otomatis setelah 3 hari dan menandai Board Tidak Aktif setelah 30 hari. Antrean dan panel aksi frontend 5B sudah berjalan dengan data asli. Frontend tidak diubah.

## Yang Dikerjakan

- `shared/src/reportWorkflow.js`: `REPORT_TRANSITIONS`, `canTransition`, `reportAllowedActions`, konstanta batas buka ulang, konfirmasi otomatis, dan Board Tidak Aktif.
- Model `InfoRequest`, kolom `Report.reporterNotSatisfied`, dan enum `RejectionReason` untuk kolom `reason` di timeline.
- 8 endpoint penindakan sesuai kontrak 5B, masing-masing mencatat entri timeline. Perubahan status memakai update bersyarat, jadi dua aksi bersamaan tidak saling menimpa.
- Pelapor tamu cukup mengirim `trackingCode` + `secret` di body (JSON atau multipart).
- Detail laporan sekarang berisi `allowedActions` sesuai siapa yang melihat, `infoRequest`, `parent`, `assignee`, dan `reporterNotSatisfied` asli.
- Aksi Penindak menghidupkan lagi Board yang Tidak Aktif.
- Job `node-cron` setiap jam (`JOBS_ENABLED`), dan kedua job juga diekspor sebagai fungsi untuk dites.
- Seed: Board SMKN 1 Surabaya berisi satu laporan di setiap status (Baru, Perlu Info, Diproses dan terlambat, Menunggu Konfirmasi dengan foto sesudah, Selesai, Ditolak).

## Perbedaan dengan Prompt

| Prompt                                   | Yang dibuat                                                    | Alasan                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tabel baru `ReportStatusLog` + backfill  | Memakai `ReportEvent` dari 4A                                  | Kolomnya sudah sama. Setiap laporan sudah punya entri pertama, jadi tidak perlu backfill           |
| Log pertama `SYSTEM`                     | `REPORTER` "Laporan dibuat"                                    | Yang membuat laporan adalah pelapor. Timeline 5B menampilkannya sebagai "Pelapor"                  |
| Batas buka ulang                         | Buka ulang ketiga langsung `RESOLVED` + `reporterNotSatisfied` | Sesuai `docs/API.md`. `REOPEN_LIMIT_REACHED` jadi tidak pernah dikirim, dan ini dicatat di dokumen |
| `answer-info` / `confirm` oleh user lain | `403 FORBIDDEN`                                                | Dokumen hanya menulis 401 dan 404. 403 ditambahkan ke dokumen                                      |

## File Penting

| File                                                | Keterangan                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| `shared/src/reportWorkflow.js`                      | Aturan status dan aksi yang diizinkan                             |
| `shared/src/schemas/report-handling.js`             | Skema request server (`*RequestSchema`, `reportQueueQuerySchema`) |
| `server/src/modules/reports/handling.service.js`    | Semua aksi, antrean, `autoConfirmReports`                         |
| `server/src/modules/reports/handling.controller.js` | Controller aksi                                                   |
| `server/src/modules/reports/reports.presenter.js`   | `allowedActionsFor`, `toQueueItem`, `infoRequest`                 |
| `server/src/modules/reports/reports.service.js`     | `viewerContext`, foto yang bisa dipakai ulang                     |
| `server/src/modules/boards/boards.service.js`       | `recordHandlerActivity`, `markInactiveBoards`                     |
| `server/src/jobs/index.js`                          | `runScheduledJobs`, `startJobs`                                   |

## Perubahan Database

Migrasi `20261006024921_add_report_handling`:

- Tabel `info_requests` (`question`, `answer`, `asked_by_id`, `answered_at`).
- Kolom `reports.reporter_not_satisfied`.
- Kolom `report_events.reason` diubah dari teks menjadi enum `RejectionReason`. Aman, karena sebelumnya selalu kosong.

## Endpoint Baru

| Method | Path                            | Auth           | Keterangan                             |
| ------ | ------------------------------- | -------------- | -------------------------------------- |
| GET    | `/api/boards/:slug/queue`       | Penindak       | Antrean dengan filter                  |
| POST   | `/api/reports/:id/process`      | Penindak       | Ke Diproses, opsional penanggung jawab |
| POST   | `/api/reports/:id/request-info` | Penindak       | Ke Perlu Info                          |
| POST   | `/api/reports/:id/answer-info`  | Pelapor / tamu | Jawab, kembali ke Baru                 |
| POST   | `/api/reports/:id/reject`       | Penindak       | Tolak dengan alasan                    |
| POST   | `/api/reports/:id/duplicate`    | Penindak       | Tandai duplikat                        |
| POST   | `/api/reports/:id/resolve`      | Penindak       | Multipart, foto sesudah + catatan      |
| POST   | `/api/reports/:id/confirm`      | Pelapor / tamu | Sudah Beres / Belum Beres              |

Perubahan `docs/API.md` Fase 5: cara `allowedActions` dihitung, isi timeline dan `infoRequest`, perilaku penanggung jawab, 403 untuk user lain, aturan duplikat, batas buka ulang, foto konfirmasi, rate limit, job terjadwal, dan `JOBS_ENABLED`.

## Cara Menguji Manual

```bash
git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Password semua akun `tindak123`.

1. **Antrean**: masuk sebagai `budi@tindak.test`, buka `http://localhost:5173/b/smkn-1-surabaya-surabaya/antrean`. Kanban berisi laporan di setiap kolom. Laporan kabel berlabel "⏰ Terlambat".
2. **Proses**: buka laporan di kolom Baru, klik **Proses**. Riwayat bertambah "Diproses", dan tombol berganti menjadi Tandai Selesai, Tolak, dan Duplikat.
3. **Tandai Selesai**: klik **Tandai Selesai**, unggah foto sesudah, tulis catatan. Status menjadi Menunggu Konfirmasi.
4. **Tolak dan Duplikat**: pada laporan lain, coba Tolak dengan alasan Lainnya tanpa catatan (ditolak), lalu dengan catatan. Coba Duplikat ke laporan aktif lain.
5. **Pelapor tamu**: keluar, kirim laporan baru sebagai tamu di SMKN 1 Surabaya, dan simpan tautan lacaknya. Masuk lagi sebagai Budi, lalu **Minta Info** pada laporan itu. Buka tautan lacak sebagai tamu, jawab pertanyaannya. Masuk sebagai Budi lagi: Proses → Tandai Selesai. Buka tautan lacak: klik **Belum Beres** dengan catatan (status Dibuka Ulang), atau **Sudah Beres** (status Selesai).
6. **Siti sebagai Penindak**: masuk sebagai `siti@tindak.test`. Antrean SMKN 1 bisa dibuka, dan filter "Penanggung jawab" Siti menampilkan laporan yang dipegangnya.
7. **Job**: matikan server, ubah data di database (misalnya mundurkan waktu Menunggu Konfirmasi 4 hari), lalu jalankan server lagi dan tunggu menit ke-7. Cara cepatnya cukup `npm test`, karena tes job memanggil fungsi yang sama.

Uji manual yang sudah dilakukan di Chrome sebagai Budi: kanban SMKN 1 berisi semua kolom dengan label Terlambat dan penanggung jawab, membuka laporan Baru, menekan **Proses**, timeline bertambah, dan tombol aksi berganti sesuai `allowedActions`. Langkah 3 sampai 6 dicakup tes integrasi, tetapi belum diklik di browser.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 289 tes lolos (12 file), client 40 tes lolos.
  - `workflow.unit.test.js` (75 tes): semua 64 pasangan status dicek terhadap tabel, ditambah aksi per status untuk Penindak, pelapor, pengunjung, dan gabungan.
  - `handling.test.js` (23 tes): alur lengkap pelapor login (aksi di setiap langkah, timeline, `resolvedAt`, aktivitas Board); alur tamu dengan Kode Lacak (Perlu Info, jawab sekali, buka ulang dua kali dengan foto, ketiga menjadi Selesai + Pelapor tidak puas); REOPENED langsung Tandai Selesai; 6 transisi tidak sah; konfirmasi di luar Menunggu Konfirmasi; dua Penindak bersamaan; tamu 401, user lain 403, Penindak diundang 403; penanggung jawab (salah 404, benar, dipertahankan, dikosongkan); pelapor (secret salah, kode salah, tanpa login, user lain, kode tanpa secret); tolak (Lainnya wajib catatan, alasan tercatat); aturan duplikat; Tandai Selesai wajib foto dan catatan; Sudah Beres tanpa foto; antrean (filter status, penanggung jawab, terlambat, bukan terlambat, tersembunyi tidak ikut, hak akses); job konfirmasi otomatis, Board Tidak Aktif dan aktif lagi, serta `runScheduledJobs`.
- `npm run build`: lolos.

## Keputusan dan Alasan

- **Server tidak menunjuk penanggung jawab otomatis.** Awalnya pemroses langsung menjadi penanggung jawab, tapi uji di browser menunjukkan dropdown 5B menampilkan "Belum ditentukan", karena daftar pilihannya (daftar Penindak dari 3A) tidak memuat OWNER. Sekarang penanggung jawab hanya terisi jika dipilih, sehingga tampilan selalu sesuai data.
- **Konfirmasi otomatis dihitung dari kapan laporan masuk Menunggu Konfirmasi** (entri timeline terakhir), bukan dari `updatedAt`, supaya perubahan lain tidak menunda hitungan.
- **Aksi pelapor tidak memperbarui aktivitas Board.** Label Tidak Aktif mengukur aktivitas Penindak.
- **Laporan tersembunyi tidak masuk antrean** sampai alur moderasi Fase 7 menentukan perlakuannya.

## Hal yang Belum Selesai

- **Untuk frontend:** dropdown "Penanggung jawab" belum memuat Penindak Utama. Perlu menambahkan `owner` dari detail Board ke daftar pilihan. Backend sudah menerima `assigneeId` milik OWNER.
- Notifikasi perubahan status, Perlu Info, duplikat, dan hampir lewat batas waktu (Fase 9).
- Aturan PRODUCT.md "boleh tolak dengan Informasi tidak cukup setelah 7 hari tanpa jawaban" belum dipaksa. Saat ini Penindak boleh menolak laporan Perlu Info kapan saja.
- Urutan antrean "Prioritas" (Fase 6).
- Di database development Oscar ada 1 laporan SMKN 1 ("Keran toilet putra lantai 2 bocor") yang sudah diproses saat uji browser, dengan Budi sebagai penanggung jawab dari versi kode sebelum perbaikan di atas.

## Catatan untuk Fase Berikutnya

- **6**: urutan `priority` dan `hot` cukup diubah di `listQueue` dan `listBoardReports`. Kunci dukungan saat status `RESOLVED`, `REJECTED`, atau `DUPLICATE`.
- **7**: laporan tersembunyi dan antrean moderasi. Isi `isBanned`.
- **9**: panggil notifikasi di setiap aksi `handling.service.js`. Pola `applyTransition` adalah satu titik yang dilewati semua perubahan status.
- Tambah aksi baru: tambahkan target di `HANDLER_ACTION_TARGETS` (`shared/src/reportWorkflow.js`), lalu `allowedActions` frontend ikut otomatis.
