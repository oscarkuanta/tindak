# Laporan Fase 6: Dukungan, Reaksi, Prioritas, Beranda (A + B)

- Branch: `feat/f6-engagement`
- Pemilik: Oscar
- Tanggal: 2026-10-06
- PR: ke `dev`

## Ringkasan

User login bisa mendukung dan bereaksi pada laporan, dan feed bisa diurutkan Ramai, Prioritas, Terbaru, atau Selesai. Beranda menampilkan laporan Ramai dan Board Populer untuk tamu, serta tab Diikuti dan Ramai untuk user yang mengikuti Board. Kotak cari langsung menampilkan Board terpopuler sebelum user mengetik. Fase ini dikerjakan fullstack dalam satu branch.

## Catatan Proses

Atas permintaan Oscar, bagian A (backend) dan B (frontend) Fase 6 dikerjakan dalam satu branch dan satu PR. Aturan `AGENTS.md` "frontend tidak mengubah server, backend tidak mengubah client" sengaja dilonggarkan untuk fase ini saja. Dua tambahan di luar prompt juga diminta Oscar dan digabung di sini:

1. Pencarian Board menampilkan Board terpopuler sebelum ada huruf yang diketik (kotak cari header dan halaman Pilih Board).
2. Perbaikan sisa Fase 5: dropdown penanggung jawab memuat Penindak Utama.

## Yang Dikerjakan

**Backend**

- Tabel `supports` dan `reactions` (satu per user per laporan), dan kolom cache di `reports`: `support_count` (default 1 untuk pelapor), `dangerous_count`, `long_standing_count`, `annoying_count`, `hot_score`, `last_engagement_at`.
- Rumus murni di `shared/src/reportScore.js`: `priorityScore`, `daysOpen`, `hotWindowStart`.
- `refreshReportScores` menghitung ulang cache dari data asli. Dipanggil saat ada dukungan atau reaksi dan di setiap perubahan status (`applyTransition`).
- Endpoint `PUT/DELETE /reports/:id/support` dan `PUT/DELETE /reports/:id/reaction`, terkunci saat Selesai, Ditolak, atau Duplikat. Pelapor tidak bisa mendukung laporannya sendiri.
- Sort `hot`, `priority`, `new`, `resolved` di feed Board, dan `priority`/`hot`/`new` di antrean (default `priority`).
- `GET /feed/home?tab=hot|following` dan `GET /boards/popular`. Setiap item berisi `board.verification`.
- Pencarian Board tanpa `q` diurutkan berdasarkan popularitas (`comparePopularity`).
- `mySupport`, `myReaction`, `isOwnReport`, `isEngagementLocked` di semua objek laporan, dan `board.owner` di detail.
- Job: skor Ramai tiap 15 menit, skor Prioritas tiap hari pukul 00.20.
- Seed: contoh dukungan dan reaksi, lalu skor semua laporan dihitung ulang.

**Frontend**

- `EngagementBar`: tombol ⬆️ Dukung dengan jumlah dan status aktif, tombol 😊 Reaksi dengan popover 3 emoji (label dan tooltip). Klik emoji yang sama untuk batal, emoji lain untuk ganti. Jumlah tampil `🚨 2 · ⏳ 1 · 😤 0`.
- Optimistic update dengan rollback dan pesan error saat server menolak.
- Tamu yang klik tombol mendapat modal "Masuk untuk mendukung laporan ini". Aksinya disimpan di `sessionStorage` (30 menit), lalu dijalankan sekali setelah login.
- Tombol terkunci tampil nonaktif dengan tooltip alasan (laporan ditutup, atau laporan milik sendiri untuk Dukung).
- Tab halaman Board: Ramai sebagai default, Prioritas untuk Penindak, dan Selesai memakai `sort=resolved`.
- Beranda baru: tamu dan user tanpa Board diikuti melihat Board Populer + feed Ramai. User dengan Board diikuti melihat tab Diikuti dan Ramai. Kartu menampilkan nama Board dengan `VerificationBadge` versi kecil.
- `VerificationBadge`, `OfficialBadge`, dan `CommunityBadge` mendapat prop `size="sm"`.
- Kotak cari header dan halaman Pilih Board menampilkan "Board terpopuler" saat kosong.
- Dropdown penanggung jawab memuat Penindak Utama ("Nama (Penindak Utama)") tanpa duplikat.

## File Penting

| File                                                  | Keterangan                                            |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `shared/src/reportScore.js`                           | Rumus skor prioritas dan jendela Ramai                |
| `server/src/modules/engagement/scores.service.js`     | Hitung ulang cache, job Ramai dan Prioritas           |
| `server/src/modules/engagement/engagement.service.js` | Dukung, reaksi, status milik user                     |
| `server/src/modules/reports/reports.service.js`       | `REPORT_SORT_ORDER`, `presentReports`, `listHomeFeed` |
| `server/src/modules/boards/boards.ranking.js`         | `comparePopularity`                                   |
| `server/src/jobs/index.js`                            | Jadwal job (`JOB_SCHEDULES`)                          |
| `client/src/components/reports/EngagementBar.jsx`     | Tombol Dukung dan Reaksi                              |
| `client/src/features/engagement/`                     | API, state optimistik, aksi tertunda                  |
| `client/src/features/feed/`                           | Hook beranda dan Board populer                        |
| `client/src/pages/home/HomePage.jsx`                  | Beranda                                               |
| `client/src/app/layouts/BoardSearch.jsx`              | Kotak cari header                                     |

## Perubahan Database

Migrasi `20261006032122_add_engagement`: tabel `supports` dan `reactions` (unik `report_id` + `user_id`, index waktu untuk jendela 48 jam), enum `ReactionType`, kolom cache di `reports`, dan index `(board_id, is_hidden, hot_score)`, `(board_id, is_hidden, priority_score)`, `(is_hidden, hot_score)`. Laporan lama otomatis mendapat `support_count = 1`.

## Endpoint Baru

| Method       | Path                        | Auth     | Keterangan                        |
| ------------ | --------------------------- | -------- | --------------------------------- |
| PUT / DELETE | `/api/reports/:id/support`  | Login    | Dukung / tarik                    |
| PUT / DELETE | `/api/reports/:id/reaction` | Login    | Reaksi / hapus                    |
| GET          | `/api/feed/home`            | Opsional | Beranda (`following` wajib login) |
| GET          | `/api/boards/popular`       | Opsional | Board populer                     |

Perubahan `docs/API.md`: bagian Fase 6 baru, `sort=resolved` di feed Board, `sort` di antrean, dan urutan pencarian tanpa `q`.

## Keputusan dan Alasan

- **Skor Ramai disimpan sebagai kolom cache `hotScore`**, bukan dihitung saat request. Dengan kolom ini, feed bisa diurutkan dan dipaginasi langsung di database memakai index. Nilainya langsung diperbarui saat ada dukungan atau reaksi, dan job tiap 15 menit menurunkan laporan yang aktivitasnya sudah lewat 48 jam. Menghitung agregasi 48 jam di setiap request butuh subquery per laporan, dan Prisma tidak bisa mengurutkan berdasarkan hitungan relasi yang difilter.
- **Jumlah dihitung ulang dari data asli** (bukan ditambah atau dikurangi satu), sehingga cache selalu konsisten walau ada klik bersamaan. Tes membandingkan cache dengan jumlah baris.
- **Hari belum selesai berhenti dihitung saat laporan ditutup**, dan job harian hanya memproses laporan aktif.
- **Reaksi yang diganti ikut dihitung Ramai** (memakai `updatedAt`), karena itu aktivitas baru.
- **Tab Diikuti diurutkan terbaru**, sedangkan Ramai diurutkan `hotScore`.
- **Urutan populer** = pengikut, laporan aktif, Official, terbaru. Rating ditambahkan di Fase 8.
- **Aksi tertunda tamu dijalankan lewat microtask** setelah data user tersedia, supaya tidak memicu `setState` sinkron di dalam effect (aturan `react-hooks`).

## Cara Menguji Manual

```bash
git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

1. **Beranda tamu**: buka `http://localhost:5173`. Board Populer tampil dengan badge Official/Komunitas, lalu feed Ramai dengan "Lubang besar di depan Indomaret" di atas (⬆️ 4, 🚨 2 · ⏳ 1 · 😤 0).
2. **Cari sebelum mengetik**: klik kotak "Cari Board..." di header. "Board terpopuler" langsung muncul. Buka `/lapor`, dan daftar Board populer juga langsung muncul.
3. **Tamu klik Dukung**: modal "Masuk untuk mendukung laporan ini" muncul. Masuk sebagai `siti@tindak.test` (password `tindak123`). Setelah kembali, dukungan langsung tercatat.
4. **Reaksi**: klik 😊 Reaksi, pilih ⏳ Sudah Lama. Tombol berubah, dan jumlah bertambah. Klik lagi ⏳ untuk batal, atau pilih emoji lain untuk ganti.
5. **Terkunci**: buka laporan Selesai "Lampu parkir motor mati". Tombol nonaktif dengan tooltip alasan.
6. **Tab Board**: buka Jalan Rungkut Madya sebagai tamu (default Ramai), lalu sebagai `budi@tindak.test` (pemilik, default Prioritas). Coba tab Selesai.
7. **Beranda user**: masuk sebagai Budi (mengikuti Kampus ITS). Tab Diikuti dan Ramai tampil.
8. **Penanggung jawab**: sebagai Budi, buka laporan Baru di SMKN 1. Dropdown memuat "Budi Santoso (Penindak Utama)" dan "Siti Aminah".

Uji manual yang sudah dilakukan di Chrome: beranda tamu (Board Populer, badge, feed Ramai dengan jumlah dukungan dan reaksi, tanpa error di console) dan kotak cari header yang langsung menampilkan Board terpopuler. Langkah 3 sampai 8 dicakup tes otomatis.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 315 tes lolos (14 file), client 51 tes lolos (18 file).
  - `engagement.test.js` (20 tes): dukungan idempoten dan bisa ditarik, cache konsisten dengan data asli, pelapor ditolak tapi dihitung 1, Penindak boleh, tamu 401, laporan terkunci di 3 status; reaksi diganti dan ditarik, tipe salah dan field asing 400, pelapor boleh bereaksi; skor prioritas dari dukungan, reaksi, bahaya, hari, berhenti saat ditutup, dan job harian; urutan hot, priority, new, resolved; `mySupport`/`myReaction`; antrean default prioritas; jendela 48 jam dan job; beranda hot/following; Board populer dan pencarian kosong; `board.owner` sebagai penanggung jawab.
  - `score.unit.test.js`: contoh PRODUCT.md (53 dan 34), bobot, `daysOpen`, jendela 48 jam, `comparePopularity`.
  - Client: `EngagementBar.test.jsx` (optimistic update, rollback, popover pilih/batal, terkunci, tamu diminta login, aksi tertunda dijalankan sekali), `HomePage.test.jsx` (tamu dan user dengan Board diikuti), `BoardSearch.test.jsx` (Board terpopuler di header dan halaman Pilih Board), `HandlerActionPanel.test.jsx` (Penindak Utama di dropdown).
- `npm run build`: lolos.

## Hal yang Belum Selesai

- Rating di urutan populer dan pencarian (Fase 8).
- Notifikasi dukungan 10, 25, 50 untuk pelapor (Fase 9).
- Pembaruan jumlah secara realtime antar pengguna (Fase 9). Saat ini angka diperbarui setelah aksi sendiri atau saat halaman dimuat ulang.
- Tes `BoardDetailPage` untuk tab default Prioritas belum ditambahkan (logikanya sederhana: `viewer.role` ada → Prioritas).

## Catatan untuk Fase Berikutnya

- **7**: laporan yang disembunyikan otomatis tetap punya skor. Pastikan feed tetap memakai `isHidden: false`.
- **8**: sisipkan rating di `comparePopularity` dan `compareSearchResults`.
- **9**: panggil notifikasi milestone dukungan di `supportReport` (`engagement.service.js`).
- Objek laporan baru di endpoint lain: pakai `presentReports(rows, user)` agar `mySupport`, `myReaction`, dan `isOwnReport` konsisten.
