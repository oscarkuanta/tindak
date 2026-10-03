# AGENTS.md: Aturan untuk Semua AI di Proyek T!indak

## Proyek

T!indak adalah board pengaduan masalah fisik (jalan rusak, sampah, fasilitas rusak) berbasis komunitas, mirip Reddit. Alur produk lengkap: `docs/PRODUCT.md`. Kontrak API: `docs/API.md`. Status: `docs/PROGRESS.md`.

## Glosarium (UI bahasa Indonesia, kode bahasa Inggris)

- Board = Board (pengganti subreddit, terbuka, dicari dengan nama)
- Penindak Utama = Board owner (role `OWNER`)
- Penindak = Board handler (role `HANDLER`)
- Laporan = Report
- Tamu = Guest (belum login)
- Kode Lacak = `trackingCode`
- Dukungan = Support
- Reaksi = Reaction (`DANGEROUS` 🚨, `LONG_STANDING` ⏳, `ANNOYING` 😤)
- Tandai Pelanggaran = Flag
- Tingkat bahaya = severity (`LOW`, `MEDIUM`, `DANGEROUS`)
- Admin = moderator platform (`User.role` `ADMIN`)
- Admin Board = pemberi verifikasi board (`User.role` `BOARD_ADMIN`)
- Komunitas / Official = status verifikasi board (`Board.verification` `COMMUNITY` / `OFFICIAL`). Official hanya diberikan Admin Board

## Stack

Node.js 22+ ESM JavaScript, Express 5, Prisma + MySQL 8, Zod, Passport + express-session, React + Vite + React Router + TanStack Query + Tailwind, Vitest + Supertest. Monorepo npm workspaces: `client`, `server`, `shared`. Jangan menambah library besar tanpa alasan tertulis di laporan fase.

## Konvensi Kode

- Nama variabel, fungsi, file, tabel, dan kolom dalam bahasa Inggris. Teks yang dilihat pengguna dan pesan error dalam bahasa Indonesia.
- Backend berlapis: routes (path dan middleware) -> controller (baca request, kirim respons) -> service (logika bisnis dan Prisma). Prisma hanya dipanggil di service.
- Semua input divalidasi dengan skema Zod dari folder `shared`. Skema yang sama dipakai di form frontend.
- Konstanta dan enum yang dipakai dua sisi disimpan di `shared`.
- Format respons dan error mengikuti `docs/API.md`. Lempar `AppError`, jangan kirim `res.status` langsung dari service.
- async/await, tidak ada callback.
- Frontend: data server diambil lewat TanStack Query hooks di folder `features`. Komponen dasar di `components/ui`. Warna dan font memakai design token, bukan nilai hex langsung di komponen.

## Keamanan

- Jangan pernah commit `.env` atau secret. Jangan menulis secret di kode, log, atau laporan.
- Password di-hash dengan bcrypt (cost 12).
- Session cookie: httpOnly, sameSite lax, secure di production.
- Endpoint sensitif diberi rate limit.
- Cek hak akses di server, bukan hanya menyembunyikan tombol di frontend.
- Redirect setelah login hanya boleh ke path relatif di situs sendiri.

## Database

- Ubah skema hanya lewat `prisma/schema.prisma` lalu jalankan `prisma migrate dev --name nama_jelas`.
- Jangan pernah mengedit file migrasi yang sudah di-merge ke `dev`.
- Perubahan skema hanya dilakukan di branch backend (bagian A). Frontend tidak menyentuh skema.
- Jika migrasi bentrok setelah pull, hapus migrasi lokal milikmu yang belum di-merge, pull, lalu buat ulang migrasinya.

## Testing

- Setiap endpoint baru wajib punya tes integrasi Supertest: kasus sukses, validasi gagal, tanpa login, dan tanpa hak akses (jika relevan).
- Logika murni (rumus skor, slug, state machine status) wajib punya unit test.
- Jangan menghapus atau melemahkan tes yang sudah ada agar lolos.
- `npm run lint` dan `npm test` wajib lolos sebelum commit.

## Git

- Branch utama: `main` (rilis) dan `dev` (integrasi). Jangan push langsung ke keduanya.
- Nama branch: `feat/f<nomor><bagian>-nama-singkat`. Contoh: `feat/f1a-auth-api`, `feat/f2b-board-ui`. Fase 0: `chore/f0-fondasi`.
- Commit format Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`. Contoh: `feat(auth): tambah login google`
- Satu PR per bagian fase, ke branch `dev`. PR butuh CI hijau dan 1 approval anggota lain.

## Protokol Fase (WAJIB diikuti setiap sesi)

1. Baca `AGENTS.md`, `docs/PROGRESS.md`, `docs/API.md`, bagian relevan `docs/PRODUCT.md`, dan laporan fase sebelumnya di `docs/reports/`.
2. Pastikan sedang di branch baru dari `dev` terbaru.
3. Tulis rencana: file yang dibuat atau diubah, perubahan database, endpoint, tes. Tunggu persetujuan manusia.
4. Kerjakan hanya scope fase ini. Jika menemukan bug di luar scope, catat di laporan, jangan diperbaiki diam-diam.
5. Jika kontrak API perlu berubah, update `docs/API.md` di commit yang sama dan sebutkan di laporan.
6. Jalankan lint dan test sampai lolos.
7. Tulis laporan `docs/reports/fase-<nomor><bagian>-<nama>.md` mengikuti `TEMPLATE.md`.
8. Update baris fase di `docs/PROGRESS.md`.
9. Commit, push, buat PR ke `dev` dengan `gh pr create` jika tersedia. Jika tidak, tampilkan judul dan isi PR untuk disalin manusia.
10. Berikan ringkasan akhir: apa yang selesai, cara menguji manual, apa yang tertunda.

## Definition of Done

- Semua kriteria selesai di prompt fase terpenuhi.
- Lint dan test lolos.
- `docs/API.md` sesuai dengan kode.
- Laporan fase ditulis, PROGRESS diupdate.
- Tidak ada `console.log` tertinggal, tidak ada secret, tidak ada kode mati.

## Larangan

- Jangan mengerjakan fitur fase lain.
- Jangan mengganti stack.
- Jangan mengubah file milik bagian lain (frontend tidak mengubah server, backend tidak mengubah client) kecuali `shared` dan `docs`.
- Jangan menjalankan perintah yang menghapus data database utama tanpa izin.
