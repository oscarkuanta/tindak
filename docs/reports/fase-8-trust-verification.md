# Laporan Fase 8: Rating, Kepercayaan, dan Verifikasi Official

- Branch: `feat/f8-trust-verification`
- Pemilik: Oscar (fullstack, bagian A dan B dalam satu branch)
- Tanggal: 2026-10-06
- PR: (diisi setelah PR dibuat)

## Ringkasan

Fase ini menambahkan rating Board oleh user, Skor Kepercayaan otomatis (rating dan tingkat tanggap), label kepercayaan, antrean Kandidat Official, dan Dashboard Verifikasi untuk Admin Board (Jadikan Official, Lewati, Cabut Official) dengan riwayat yang tercatat. Skor kepercayaan (otomatis) dan status Official (manual) dibuat jelas berbeda, baik di kode maupun tampilan.

## Yang Dikerjakan

Backend:

- Model `BoardRating`, `BoardVerificationLog`, dan kolom cache kepercayaan serta `candidateSince` di `Board`.
- Modul murni `trustScore.js`: rating tertimbang, skor, label, tingkat tanggap, persentase ditolak, dan checklist 7 syarat kandidat.
- `recomputeBoardTrust` menghitung ulang skor dan status kandidat. Dipanggil saat rating berubah, laporan dibuat, status laporan berubah, laporan dipulihkan atau dihapus, Board dibekukan atau dicairkan, tanda Board Palsu berubah, dan job harian.
- Endpoint rating (`PUT rating`, `GET rating/me`, `GET ratings/summary`) dan endpoint Admin Board (`stats`, `candidates`, `official`, detail, `verify`, `skip`, `revoke`).
- Pembekuan Board Official kini juga menulis log `REVOKED` atas nama sistem (TODO Fase 7 selesai).
- Urutan pencarian dan Board populer memakai `trustScore`.
- Detail Board menyertakan `verificationHistory` sesuai hak lihat.
- Fungsi notifikasi `notifyBoardAdminsNewCandidate`, `notifyBoardVerified`, `notifyBoardVerificationRevoked` (masih berupa log, diisi Fase 9).
- Seed demo: 19 akun `warga01` sampai `warga19@tindak.test`, Kampus ITS Sukolilo berumur 40 hari dengan 19 rating, beberapa rating untuk Board lain.

Frontend:

- `TrustBadge` berbentuk pill (⭐ skor dan label berwarna) dengan tooltip "Dihitung otomatis dari rating dan kecepatan tanggap". `OfficialBadge` tetap centang biru dengan tooltip "Diverifikasi manual oleh Admin Board". Tampil di kartu Board, saran pencarian, dan header Board.
- Panel Skor Kepercayaan di sidebar Board: skor, sebaran bintang, pilihan cepat, tingkat tanggap, persentase ditolak, jumlah dipulihkan moderator, penjelasan cara skor dihitung, dan tombol Beri Rating.
- Modal Beri Rating dengan bintang dan pilihan cepat; menampilkan alasan jika belum boleh.
- `/verifikasi`: kartu statistik, tab Kandidat (tabel, klik baris ke detail) dan tab Official (cari, filter Perlu Ditinjau Ulang, Cabut).
- `/verifikasi/:slug`: info Board dan pemilik, checklist ✓/✕, sebaran bintang, statistik, ringkasan tanda, timeline riwayat, modal Jadikan Official, Lewati, dan Cabut Official.
- Pengaturan Board bagian Verifikasi menampilkan riwayat untuk Penindak Utama, termasuk alasan pencabutan.
- `/verifikasi-board` dialihkan ke `/verifikasi`; halaman placeholder lama dihapus.

## File Penting

| File                                               | Keterangan                                           |
| -------------------------------------------------- | ---------------------------------------------------- |
| `shared/src/constants/verification.js`             | Syarat kandidat, aturan skor, pilihan cepat          |
| `shared/src/schemas/verification.js`               | Skema rating, verify, skip, revoke, query            |
| `server/src/modules/trust/trustScore.js`           | Rumus murni dan checklist                            |
| `server/src/modules/trust/trust.service.js`        | Hitung ulang skor dan status kandidat                |
| `server/src/modules/trust/ratings.service.js`      | Syarat dan simpan rating                             |
| `server/src/modules/trust/boardAdmin.service.js`   | Antrean, detail, verify, skip, revoke                |
| `client/src/components/boards/BoardBadges.jsx`     | TrustBadge dan OfficialBadge                         |
| `client/src/components/trust/*`                    | Panel skor, modal rating, modal verifikasi, timeline |
| `client/src/pages/verification/*`                  | Dashboard dan detail verifikasi                      |
| `server/tests/trustScore.test.js`, `trust.test.js` | Unit dan integrasi Fase 8                            |

## Perubahan Database

- `20261006085132_add_board_trust`: enum `TrustLabel`, `RatingQuickTag`, `VerificationAction`; tabel `board_ratings` (unik `boardId + userId`) dan `board_verification_logs`; kolom `rating_count`, `rating_sum`, `response_rate`, `trust_score`, `trust_label`, `rejected_rate`, `candidate_since` di `boards`; index `candidate_since` dan `verification + trust_score`.
- Board lama baru punya skor setelah dihitung ulang (job harian, seed, atau aksi apa pun pada Board itu).

## Endpoint Baru

| Method | Path                                   | Auth        | Keterangan                |
| ------ | -------------------------------------- | ----------- | ------------------------- |
| PUT    | `/api/boards/:slug/rating`             | Login       | Beri atau ubah rating     |
| GET    | `/api/boards/:slug/rating/me`          | Opsional    | Rating saya dan `canRate` |
| GET    | `/api/boards/:slug/ratings/summary`    | Publik      | Sebaran bintang           |
| GET    | `/api/board-admin/stats`               | Admin Board | Statistik verifikasi      |
| GET    | `/api/board-admin/candidates`          | Admin Board | Antrean kandidat          |
| GET    | `/api/board-admin/official`            | Admin Board | Daftar Board Official     |
| GET    | `/api/board-admin/boards/:slug`        | Admin Board | Detail verifikasi         |
| POST   | `/api/board-admin/boards/:slug/verify` | Admin Board | Jadikan Official          |
| POST   | `/api/board-admin/boards/:slug/skip`   | Admin Board | Lewati                    |
| POST   | `/api/board-admin/boards/:slug/revoke` | Admin Board | Cabut Official            |

Perubahan kontrak di `docs/API.md`: bagian Fase 8 baru; contoh BoardCard dan detail Board diperbarui (`trustScore` angka, `ratingCount`, `averageStars`, `responseRate` persen atau `null`, `verificationHistory`); urutan pencarian dan populer memakai `trustScore`.

## Cara Menguji Manual

1. `npm run db:migrate`, lalu `npm run db:seed`, lalu `npm run dev`.
2. Masuk sebagai `budi@tindak.test` (password `tindak123`). Buka Board Kampus ITS Sukolilo: skornya 4,4 dengan label Terpercaya, tapi masih Komunitas. Klik Beri Rating, pilih 5 bintang dan 👍 Tanggap, kirim.
3. Masuk sebagai `boardadmin@tindak.test`, buka menu akun lalu Dashboard Verifikasi. Kampus ITS muncul di tab Kandidat.
4. Klik barisnya, cek checklist (semua ✓), klik Jadikan Official, isi catatan, kirim. Buka halaman Board: centang Official muncul di samping badge skor.
5. Di tab Official, klik Cabut dan coba kirim alasan kosong (ditolak), lalu isi alasan minimal 10 karakter.
6. Masuk sebagai `budi@tindak.test` dan coba memberi rating ke Board milikmu sendiri: muncul alasan "Penindak tidak bisa memberi rating ke Board sendiri".
7. Buka `/verifikasi` sebagai `admin@tindak.test`: 403.

## Hasil Tes

- `npm run lint`: lolos tanpa peringatan.
- `npm test`: server 367 tes lolos (17 file), client 74 tes lolos (21 file).
- `npm run build -w client`: berhasil.

## Keputusan dan Alasan

- Atas keputusan pemilik proyek, syarat rating disederhanakan: cukup login dan mengikuti Board (tanpa jeda 24 jam dan tanpa syarat pernah lapor), dan rating boleh diubah kapan saja seperti upvote. Alasannya, satu user tetap hanya punya satu rating, dan keputusan Official tetap manual oleh Admin Board. PRODUCT.md sudah disesuaikan.
- Lewati: Board keluar dari antrean selama 30 hari (`SKIP_COOLDOWN_DAYS`), lalu kembali jika masih memenuhi syarat. PRODUCT.md disesuaikan.
- Label memakai enum yang sudah ada di API.md (`NONE` untuk tanpa label, `INACTIVE` untuk Board tidak aktif), bukan `NEUTRAL` seperti di prompt.
- Field kepercayaan tetap datar di BoardCard dan detail (sesuai API.md yang sudah dipakai frontend), bukan objek `trust` baru.
- Catatan Jadikan Official wajib (minimal 5 karakter) sesuai PRODUCT.md, prompt menyebut opsional.
- Daftar Perlu Ditinjau Ulang dari PRODUCT.md ditambahkan sebagai filter di tab Official dan angka di statistik.
- Contoh 4,4 dan 2,3 yang disebut prompt tidak ada di PRODUCT.md, jadi dibuat dua contoh yang menghasilkan angka itu dan ditulis di API.md serta unit test.
- `responseRate` di API berupa persen bulat agar langsung bisa ditampilkan; di database disimpan sebagai pecahan 0 sampai 1.
- Board baru langsung diberi skor awal 3,0 sesuai rumus, sehingga `null` hanya untuk data lama. Satu tes Fase 2 yang mengharapkan `trustScore: null` diperbarui karena kontraknya memang berubah.

## Hal yang Belum Selesai

- Notifikasi kandidat baru, Official diberikan, dan Official dicabut masih berupa log (Fase 9).
- Board lama di database lokal yang belum di-seed ulang baru mendapat skor setelah job harian atau aksi pada Board tersebut.

## Catatan untuk Fase Berikutnya

- Fase 9: isi fungsi di `server/src/modules/notifications/notifications.service.js` (`notifyBoardAdminsNewCandidate`, `notifyBoardVerified`, `notifyBoardVerificationRevoked`).
- Fase 10: data rating dan skor tersedia di kolom cache `Board` dan endpoint `ratings/summary`.
- Angka syarat kandidat dan aturan skor cukup diubah di `shared/src/constants/verification.js`.
