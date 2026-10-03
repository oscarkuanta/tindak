Jalankan FASE 3: IKUTI BOARD DAN KELOLA PENINDAK sesuai Protokol Fase di AGENTS.md. Bagian yang saya kerjakan: [ISI: A atau B]. Kerjakan hanya bagian itu. Branch: feat/f3[a/b]-follow-handler. Baca docs/PRODUCT.md bagian "Tambah Penindak", "Ikuti Board", dan "Role".

BAGIAN A (BACKEND)
Database:
- BoardFollower: id, boardId, userId, notifyLevel (enum ALL, DANGEROUS_ONLY, OFF, default ALL), createdAt. Unique (boardId, userId).
Endpoint:
- POST /api/boards/:slug/follow dan DELETE /api/boards/:slug/follow (requireAuth). Idempoten.
- PATCH /api/boards/:slug/follow (ubah notifyLevel).
- GET /api/me/follows: Board yang diikuti.
- POST /api/boards/:slug/handlers (OWNER): body email. User harus sudah terdaftar (404 USER_NOT_FOUND). Sudah anggota: 409. Buat BoardMember HANDLER INVITED. Maks 10 Penindak per Board.
- GET /api/boards/:slug/handlers (OWNER dan HANDLER): daftar anggota dengan status.
- DELETE /api/boards/:slug/handlers/:userId (OWNER): cabut Penindak atau batalkan undangan. OWNER tidak bisa mencabut dirinya.
- GET /api/me/invitations, POST /api/me/invitations/:id/accept, POST /api/me/invitations/:id/decline.
- POST /api/boards/:slug/transfer (OWNER): body userId Penindak ACTIVE. Tukar peran dalam satu transaksi. Penerima tidak boleh melebihi batas 3 Board milik.
- Update GET /api/boards/:slug dan search: followerCount nyata, isFollowing untuk user login.
Catat audit sederhana di laporan (tabel audit log akan dibuat di Fase 7, jadi untuk sekarang tulis TODO di service).
Tes: follow/unfollow idempoten, undang, terima, tolak, cabut, transfer, semua penolakan hak akses.

TAMBAHAN (alur verifikasi Board):
- Saat transfer kepemilikan, status verification Board tidak berubah. Catat kejadian ini di TODO audit dan siapkan pemanggilan notifikasi ke semua BOARD_ADMIN dengan tipe BOARD_OWNER_CHANGED (fungsi kosong dulu, diisi Fase 9), karena Admin Board perlu tahu pemilik Board Official berganti.
- Penindak (OWNER maupun HANDLER) tidak punya akses apa pun ke field verification.

BAGIAN B (FRONTEND)
- Tombol Ikuti di halaman Board dan kartu Board berfungsi (tamu: LoginModal). Optimistic update.
- Dropdown pengaturan notifikasi di tombol Ikuti (Semua laporan, Hanya Berbahaya, Mati).
- Sidebar kiri menampilkan daftar Board yang diikuti.
- Halaman /board-diikuti.
- Pengaturan Board bagian "Penindak": undang lewat email, daftar anggota dengan status (Diundang, Aktif), cabut dengan konfirmasi, alihkan kepemilikan dengan konfirmasi ketik nama Board.
- Halaman /undangan atau bagian di dropdown avatar untuk menerima dan menolak undangan, dengan badge jumlah undangan.
Tes komponen untuk tombol Ikuti dan form undang.

KRITERIA SELESAI
Sesuai Definition of Done di AGENTS.md.

