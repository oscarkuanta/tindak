# Laporan Fase 5B: Penindakan dan Status

- Branch: feat/f5b-handling
- Pemilik: Akmal
- Tanggal: 2026-10-05
- PR: -

## Ringkasan

Frontend penindakan menyediakan antrean Kanban dan daftar, aksi Penindak, tanggapan pelapor, timeline, serta pelacakan tamu. Implementasi membaca allowedActions dari backend. Backend Fase 4A dan 5A belum tersedia di branch dev untuk pengujian end-to-end.

## Yang Dikerjakan

- Menambahkan /b/:slug/antrean dengan filter status, kategori, tingkat bahaya, Penindak, dan keterlambatan; mendukung tampilan daftar dan Kanban.
- Menambahkan drag and drop yang memanggil aksi hanya jika allowedActions dari server mengizinkan transisi. Aksi yang memerlukan input membuka modal pada detail laporan.
- Menambahkan detail dan pelacakan laporan dengan panel Penindak, jawaban Perlu Info, konfirmasi selesai, foto sebelum/sesudah, timeline, dan label status khusus.
- Menambahkan pencarian laporan induk untuk penandaan duplikat, pilihan Penanggung Jawab, upload bukti sesudah, serta foto tambahan saat pelapor membuka ulang.
- Menambahkan TanStack Query hooks, skema validasi dan konstanta shared, route, serta kontrak API Fase 5 dan kebutuhan pembacaan laporan.

## File Penting

| File                                                                                                      | Keterangan                                                                 |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| client/src/pages/board-queue/BoardQueuePage.jsx                                                           | Antrean, filter, Kanban dan daftar                                         |
| client/src/pages/report-detail/ReportDetailPage.jsx dan client/src/pages/track-report/TrackReportPage.jsx | Detail untuk user dan pelacakan tamu                                       |
| client/src/components/reports/HandlerActionPanel.jsx                                                      | Aksi Penindak, modal, penanggung jawab dan pencarian laporan induk         |
| client/src/components/reports/ReporterResponsePanel.jsx                                                   | Jawaban Perlu Info dan konfirmasi pelapor                                  |
| client/src/components/reports/BeforeAfterSlider.jsx dan ReportTimeline.jsx                                | Perbandingan bukti dan riwayat                                             |
| client/src/features/handling/                                                                             | API dan TanStack Query hooks                                               |
| shared/src/constants/report-handling.js dan shared/src/schemas/report-handling.js                         | Status, alasan penolakan, aksi dan validasi                                |
| docs/API.md                                                                                               | Kontrak API Fase 5, field detail, dan parameter q untuk pencarian duplikat |

## Perubahan Database

Tidak ada. Tidak ada file server atau skema database yang diubah.

## Endpoint Baru

Frontend memakai endpoint yang didokumentasikan di docs/API.md. Implementasi endpoint dan perubahan database berada di bagian backend Fase 4A/5A.

| Method | Path                          | Auth                            | Keterangan                                  |
| ------ | ----------------------------- | ------------------------------- | ------------------------------------------- |
| GET    | /api/boards/:slug/queue       | Penindak                        | Antrean dengan filter dan pagination        |
| POST   | /api/reports/:id/process      | Penindak                        | Mulai proses atau tetapkan Penanggung Jawab |
| POST   | /api/reports/:id/request-info | Penindak                        | Meminta informasi tambahan                  |
| POST   | /api/reports/:id/answer-info  | Pelapor atau tamu dengan secret | Menjawab pertanyaan satu kali               |
| POST   | /api/reports/:id/reject       | Penindak                        | Menolak laporan dengan alasan               |
| POST   | /api/reports/:id/duplicate    | Penindak                        | Menautkan laporan ke laporan induk          |
| POST   | /api/reports/:id/resolve      | Penindak                        | Upload foto sesudah dan menunggu konfirmasi |
| POST   | /api/reports/:id/confirm      | Pelapor atau tamu dengan secret | Menutup atau membuka ulang laporan          |

Kontrak ditambahkan ke docs/API.md. Pencarian duplikat menggunakan parameter q pada GET /api/boards/:slug/reports.

## Cara Menguji Manual

1. Siapkan backend Fase 4A/5A dan akun seed sebagai Penindak Utama, Penindak, pelapor login, serta tamu yang memiliki tautan lacak.
2. Buka /b/:slug/antrean. Uji filter, tampilan daftar/Kanban, dan seret laporan ke kolom yang diizinkan.
3. Dari detail laporan, uji Proses, Minta Info, Tolak, Duplikat, pilih Penanggung Jawab, dan Tandai Selesai dengan minimal satu foto.
4. Sebagai pelapor, jawab permintaan informasi lalu uji Sudah Beres dan Belum Beres. Untuk tamu, buka /lacak/:code?secret=... dan ulangi alur.
5. Pastikan alasan Lainnya memerlukan catatan, foto sebelum/sesudah dapat dibandingkan, batas buka ulang disediakan oleh allowedActions, dan label terlambat/otomatis/tidak puas muncul dari data server.

## Hasil Tes

- npm run lint: lolos.
- npm run test -w client -- --maxWorkers=1: 13 file dan 36 tes lolos.
- npm run build -w client: lolos. Vite memberi peringatan chunk utama 555,29 kB, melebihi rekomendasi 500 kB.
- npm test: berhenti pada setup server karena .env.test tidak tersedia dan DATABASE_URL kosong. Guard menolak tes sebelum koneksi atau migrasi database; tidak ada perubahan database.

## Keputusan dan Alasan

- UI hanya menampilkan aksi yang dikirim melalui allowedActions agar aturan akses dan transisi berasal dari backend.
- Drag and drop memakai API HTML bawaan browser agar tidak menambah library untuk interaksi sederhana.
- Parameter q pada daftar laporan Board ditambahkan ke kontrak agar modal Duplikat dapat mencari laporan induk tanpa memuat seluruh daftar ke browser.
- Rahasia tamu dikirim pada body mutasi; pembacaan detail lacak tetap memakai parameter secret sesuai kontrak Fase 4.

## Hal yang Belum Selesai

- Uji end-to-end menunggu endpoint Fase 4A/5A dan akun seed.
- Branch dev tidak memuat PR Fase 4B (#16), sehingga halaman laporan dan lacak yang dibutuhkan Fase 5 disediakan di branch ini. Jika PR #16 digabung lebih dahulu, rute dan halaman detail/lacak perlu diselaraskan saat integrasi.
- Backend perlu mendukung parameter q untuk pencarian judul pada daftar laporan Board.
- Tes penuh root tertahan oleh konfigurasi database tes yang belum tersedia.

## Catatan untuk Fase Berikutnya

- Pertahankan allowedActions sebagai sumber kebenaran UI dan pastikan respons detail serta antrean mengirim field yang didefinisikan di docs/API.md.
- Pastikan mutasi tamu memeriksa trackingCode dan secret pada server, serta backend membatasi jawaban Perlu Info dan buka ulang sesuai aturan.
