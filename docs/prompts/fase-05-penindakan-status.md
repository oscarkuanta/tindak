Jalankan FASE 5: PENINDAKAN DAN STATUS sesuai Protokol Fase di AGENTS.md. Bagian yang saya kerjakan: [ISI: A atau B]. Branch: feat/f5[a/b]-handling. Baca docs/PRODUCT.md bagian "Status Laporan", "Perlu Info", "Konfirmasi Selesai", "Duplikat", "Batas Waktu", dan "Timeline".

BAGIAN A (BACKEND)
Database:
- ReportStatusLog: id, reportId, fromStatus, toStatus, actorUserId (nullable), actorType (HANDLER, REPORTER, SYSTEM), reason (enum alasan tolak, nullable), note, createdAt.
- InfoRequest: id, reportId, question, answer (nullable), askedById, answeredAt.
- Buat log pertama (null -> NEW, SYSTEM) untuk laporan baru dan backfill laporan lama di migrasi atau script.
State machine (modul murni di shared atau server/utils, wajib unit test):
- NEW -> IN_PROGRESS, NEED_INFO, REJECTED, DUPLICATE
- NEED_INFO -> NEW (saat dijawab), REJECTED
- IN_PROGRESS -> AWAITING_CONFIRMATION, REJECTED, DUPLICATE
- AWAITING_CONFIRMATION -> RESOLVED, REOPENED
- REOPENED -> IN_PROGRESS, AWAITING_CONFIRMATION
- Transisi lain: 409 INVALID_TRANSITION.
Endpoint (Penindak = OWNER atau HANDLER ACTIVE Board itu):
- POST /api/reports/:id/process (opsional assigneeId Penindak Board itu)
- POST /api/reports/:id/request-info { question }
- POST /api/reports/:id/answer-info { answer } (pelapor login, atau tamu dengan trackingCode + secret). Hanya satu kali.
- POST /api/reports/:id/reject { reason, note }. Alasan LAINNYA wajib note.
- POST /api/reports/:id/duplicate { parentId } (induk harus di Board sama, aktif, bukan dirinya, bukan duplikat lain)
- POST /api/reports/:id/resolve (multipart, wajib minimal 1 foto AFTER, wajib note): status AWAITING_CONFIRMATION.
- POST /api/reports/:id/confirm { result: "resolved" atau "not_resolved", note } oleh pelapor (login atau tamu dengan kode). not_resolved wajib note, boleh foto EXTRA. reopenCount maks 2, setelah itu tombol tidak tersedia dan laporan diberi flag "Pelapor tidak puas" lalu RESOLVED.
- Setiap aksi Penindak memperbarui Board.lastHandlerActivityAt.
- GET /api/boards/:slug/queue (Penindak): laporan dengan filter status, kategori, severity, assignee, overdue.
Job terjadwal (node-cron, bisa dimatikan lewat env, jalankan juga sebagai fungsi yang bisa dites):
- AWAITING_CONFIRMATION lebih dari 3 hari -> RESOLVED dengan log SYSTEM "Dikonfirmasi otomatis".
- Board tanpa aktivitas Penindak 30 hari -> INACTIVE, kembali ACTIVE saat ada aktivitas.
- Hitung isOverdue: severity DANGEROUS, belum AWAITING_CONFIRMATION atau selesai, dan now > dueAt.
Detail laporan mengembalikan timeline lengkap, foto BEFORE dan AFTER, infoRequest, isOverdue, dan aksi yang boleh dilakukan user saat ini (allowedActions) agar frontend tidak menebak.
Tes: semua transisi valid dan tidak valid, hak akses Penindak vs user lain, konfirmasi tamu dengan secret, batas buka ulang, job auto-resolve dan job Board tidak aktif, overdue.

BAGIAN B (FRONTEND)
- /b/:slug/antrean (Penindak): tampilan daftar dengan filter dan tampilan kanban (kolom Baru, Perlu Info, Diproses, Menunggu Konfirmasi, Selesai). Drag antar kolom hanya untuk transisi yang valid, transisi yang butuh input (tolak, selesai) membuka modal.
- Panel aksi di detail laporan untuk Penindak: tombol sesuai allowedActions, modal Minta Info, modal Tolak (pilih alasan + catatan), modal Duplikat (cari laporan induk di Board), modal Tandai Selesai (unggah foto sesudah + catatan), pilih penanggung jawab.
- Untuk pelapor (login di detail laporan, tamu di halaman lacak): form jawab Perlu Info, kartu konfirmasi dengan slider foto sebelum dan sesudah, tombol Sudah Beres dan Belum Beres.
- Timeline vertikal dengan ikon status dan waktu.
- Label "⏰ Terlambat", "Dikonfirmasi otomatis", "Pelapor tidak puas", "Dibuka Ulang".
- Banner Board Tidak Aktif.
Tes komponen: tombol mengikuti allowedActions, modal Tolak wajib catatan untuk alasan Lainnya, slider before after tampil.

KRITERIA SELESAI
Satu laporan bisa dibawa dari Baru sampai Selesai lewat UI, termasuk dari sisi tamu. Sesuai Definition of Done di AGENTS.md.
