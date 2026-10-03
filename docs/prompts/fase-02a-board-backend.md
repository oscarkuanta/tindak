Jalankan FASE 2A: BOARD BACKEND sesuai Protokol Fase di AGENTS.md. Branch: feat/f2a-board-api dari dev terbaru.

BACA DULU
- docs/PRODUCT.md bagian Board, Verifikasi Official, dan Role
- docs/API.md bagian Fase 2 (sudah diperbarui dengan field verification dan role BOARD_ADMIN)
- docs/reports/ laporan Fase 1A dan 1B
docs/PRODUCT.md dan docs/API.md adalah sumber kebenaran. Jika ada yang bertentangan dengan prompt ini, ikuti dokumen, lalu sebutkan perbedaannya di rencana sebelum menulis kode.

TUJUAN
User login bisa membuat Board, mencari Board, melihat detail Board, dan pemilik bisa mengatur Board serta kategorinya. Semua Board baru berstatus Komunitas. Status Official hanya diberikan Admin Board di Fase 8, jadi fase ini hanya menyiapkan field-nya.

TUGAS TAMBAHAN DI AWAL
1. docs/PROGRESS.md: ubah baris 1A dan 1B dari "Review" menjadi "Selesai" dengan link PR masing-masing (cari dengan gh pr list --state merged, atau tanyakan saya jika gh tidak tersedia).
2. Aturan PR berubah: approval TIDAK wajib. Pembuat PR boleh merge sendiri setelah CI hijau. Update kalimat ini di AGENTS.md (bagian Git dan Definition of Done), CONTRIBUTING.md, dan .github/pull_request_template.md.

ROLE BOARD_ADMIN (melengkapi Fase 1A)
- Tambah nilai BOARD_ADMIN ke enum UserRole (USER, ADMIN, BOARD_ADMIN).
- Env baru BOARD_ADMIN_EMAILS (dipisah koma). Tambahkan ke .env.example dengan komentar dan ke validasi env.
- Logika penentuan role saat user dibuat atau login (email/password maupun Google): email ada di ADMIN_EMAILS -> ADMIN. Jika tidak, email ada di BOARD_ADMIN_EMAILS -> BOARD_ADMIN. Satu akun hanya punya satu role. Jika ada di dua daftar, ADMIN yang dipakai.
- Script npm run make-board-admin -- email@contoh.com
- Middleware requireBoardAdmin: 403 FORBIDDEN untuk selain BOARD_ADMIN. ADMIN (moderator) juga ditolak, karena memberi status Official adalah tugas khusus Admin Board.
- toPublicUser tetap mengirim role.
- Tes: penentuan role dari kedua daftar, prioritas ADMIN, requireBoardAdmin menolak USER dan ADMIN.

DATABASE (Prisma)
Enum:
- BoardScopeType: SCHOOL, CAMPUS, OFFICE, ROAD, AREA, PUBLIC_FACILITY, OTHER
- BoardVerification: COMMUNITY, OFFICIAL
- BoardStatus: ACTIVE, INACTIVE, FROZEN
- BoardMemberRole: OWNER, HANDLER
- BoardMemberStatus: INVITED, ACTIVE

Model Board:
- id, slug (unique), name (3 sampai 80), city, scopeType
- managerTitle (nullable, maks 60, hanya informasi, contoh "Wakasek Sarpras")
- description (20 sampai 500), coverUrl (nullable)
- verification (default COMMUNITY), verifiedAt (nullable), verifiedById (nullable, relasi User)
- dangerSlaHours (default 48, rentang 1 sampai 168)
- status (default ACTIVE), lastHandlerActivityAt (default now)
- ownerId (relasi User), createdAt, updatedAt
- Index: name, city, (city, scopeType), verification
TIDAK ADA field managerType atau managerStatus. Field itu sudah dihapus dari alur.

Model BoardMember: id, boardId, userId, role, status, invitedById (nullable), createdAt. Unique (boardId, userId).
Model Category: id, boardId, name (2 sampai 40), sortOrder, createdAt. Unique (boardId, name).

SHARED
1. constants/boards.js:
   - Label Indonesia setiap enum. Contoh: SCHOOL "Sekolah", ROAD "Jalan", COMMUNITY "Komunitas", OFFICIAL "Official".
   - DEFAULT_CATEGORIES per scopeType:
     SCHOOL, CAMPUS, OFFICE: Kebersihan, Kerusakan Fasilitas, Listrik, Air dan Sanitasi, Keamanan, Lainnya
     ROAD: Jalan Berlubang, Lampu Jalan, Drainase dan Banjir, Rambu dan Marka, Pohon Tumbang, Lainnya
     AREA, PUBLIC_FACILITY, OTHER: Sampah, Drainase, Penerangan, Fasilitas Rusak, Keamanan, Lainnya
   - MAX_OWNED_BOARDS = 3
2. constants/cities.js: daftar lengkap kabupaten dan kota di Indonesia dengan nama resmi (contoh "Kota Surabaya", "Kabupaten Sidoarjo"). Ambil dari dataset wilayah publik terpercaya, simpan sebagai array statis, sebut sumbernya di laporan.
3. schemas/boards.js: createBoardSchema, updateBoardSchema, searchBoardSchema, categorySchema. Pakai .strict() agar field yang tidak dikenal (termasuk verification) ditolak. city wajib salah satu dari daftar kota.

ENDPOINT
1. POST /api/boards (requireAuth)
   - Satu transaksi: buat Board dengan verification COMMUNITY, buat BoardMember OWNER ACTIVE, buat kategori bawaan sesuai scopeType, lalu kategori tambahan dari body (opsional, maks 10, tanpa duplikat).
   - Body yang mengirim verification ditolak 400 (karena .strict()).
   - Sudah punya 3 Board sebagai OWNER: 409 BOARD_LIMIT_REACHED.
   - Slug: slugify(name + " " + city tanpa awalan Kota/Kabupaten), huruf kecil. Jika bentrok, tambah akhiran acak 4 karakter. Slug tidak berubah walau nama diedit.
   - Respons 201: detail Board.
2. GET /api/boards/similar?name=&city= (publik): maks 5 Board di kota sama dengan nama mirip. Abaikan kata umum (jalan, jl, sekolah) jika membuat hasil terlalu luas, jelaskan logikamu.
3. GET /api/boards/search?q=&city=&scopeType=&verification=&page=&limit= (publik)
   - q minimal 2 karakter.
   - Urutan: (1) tingkat kecocokan nama: diawali q dulu, lalu mengandung q, (2) OFFICIAL di atas COMMUNITY, (3) createdAt terbaru. Fase 8 akan menyisipkan trustScore setelah langkah 2, jadi tulis urutan di satu fungsi service yang mudah diubah.
   - Pagination: limit default 20, maks 50. meta: page, limit, total, totalPages.
   - Item: slug, name, city, scopeType, verification, verifiedAt, coverUrl, status, createdAt, followerCount (0 dulu), activeReportCount (0 dulu), trust (null dulu).
4. GET /api/boards/:slug (optionalAuth)
   - Detail, kategori terurut, pemilik (id, name, avatarUrl), managerTitle, verification, verifiedAt, jumlah Penindak aktif, myRole (OWNER, HANDLER, atau null).
   - FROZEN: 404 untuk publik, tetap terlihat untuk ADMIN dan BOARD_ADMIN.
   - Tidak ada: 404 BOARD_NOT_FOUND.
5. PATCH /api/boards/:slug (OWNER): boleh ubah name, managerTitle, description, coverUrl, dangerSlaHours. Tidak boleh ubah slug, city, scopeType, verification.
6. POST /api/boards/:slug/categories (OWNER): maks 20 kategori. Duplikat 409 CATEGORY_EXISTS.
7. PATCH /api/boards/:slug/categories/:id (OWNER): ubah nama atau sortOrder.
8. DELETE /api/boards/:slug/categories/:id (OWNER): minimal tersisa 1. Tulis TODO: Fase 4 menolak penghapusan kategori yang dipakai laporan.
9. GET /api/me/boards (requireAuth): Board tempat user OWNER atau HANDLER ACTIVE, dengan myRole.
10. GET /api/meta/cities?q= (publik): maks 20 kota yang cocok.

HAK AKSES
Helper getBoardMembership(boardId, userId) dan middleware requireBoardRole(...roles) yang mencari Board dari :slug, mengisi req.board dan req.membership, lalu menolak 403 jika role tidak cocok. Fase berikutnya memakai helper ini.

TES (WAJIB)
- Buat Board sukses: verification COMMUNITY, OWNER tercatat, kategori bawaan sesuai scopeType, slug benar.
- Body berisi verification "OFFICIAL" -> 400.
- Tanpa login 401. Kota tidak valid 400. Board ke-4 409.
- Slug bentrok menghasilkan slug berbeda.
- Search: awalan sebelum mengandung, OFFICIAL di atas COMMUNITY pada tingkat kecocokan yang sama, filter verification, filter kota, pagination. (Buat Board OFFICIAL langsung lewat Prisma di tes.)
- Similar: hanya kota sama.
- Detail: myRole benar untuk OWNER, user lain, tamu. FROZEN 404 untuk publik, terlihat untuk ADMIN dan BOARD_ADMIN.
- PATCH bukan OWNER 403. PATCH dengan verification ditolak. Slug tidak berubah.
- Kategori: tambah, duplikat 409, hapus terakhir ditolak.
- Unit test slugify.
- Tes role BOARD_ADMIN di atas.

SEED (prisma/seed.js, aman dijalankan ulang dengan upsert)
- 4 user: 1 ADMIN, 1 BOARD_ADMIN, 2 USER biasa. Tulis email dan password demo di laporan.
- 5 Board di Surabaya dan Sidoarjo dengan jenis berbeda. 1 di antaranya OFFICIAL (verifiedAt diisi, verifiedById = user BOARD_ADMIN).

KRITERIA SELESAI
- Semua endpoint sesuai docs/API.md. Update docs/API.md jika ada perubahan.
- Semua tes lolos, termasuk tes Fase 1A yang sudah ada.
- Laporan berisi contoh request setiap endpoint dan daftar akun seed.
