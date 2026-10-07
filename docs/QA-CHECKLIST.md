# QA Checklist T!indak

Alur per role sesuai PRODUCT.md. Kolom **Backend** diisi Fase 11A (2026-10-07) dari tes otomatis dan `npm run smoke` terhadap server mode production dengan data demo. Kolom **Tampilan** diisi Fase 11B saat dicek di browser.

Keterangan: ✅ lolos, ❌ gagal, ⏳ belum dicek.

Akun dan data: lihat `docs/DEMO.md`. Password semua akun demo `demo1234`.

## Tamu

| #   | Langkah                                                                     | Backend (bukti)                                  | Tampilan |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| T1  | Buka beranda, lihat feed Ramai dan Board populer                            | ✅ smoke: feed beranda, Board populer            | ⏳       |
| T2  | Cari "Yani": Board Official di atas, Jl. A. Yani berlabel Perlu Waspada     | ✅ smoke: pencarian; `trust.test.js` urutan      | ⏳       |
| T3  | Buka detail Board dan laporan, foto buram punya tombol Tampilkan            | ✅ `reports.test.js`                             | ⏳       |
| T4  | Lapor tanpa login dengan foto dan captcha, dapat Kode Lacak                 | ✅ `flows.test.js` alur tamu                     | ⏳       |
| T5  | Buka Lacak `TRACK234`, status berubah tanpa refresh saat Penindak bertindak | ✅ smoke: Lacak; `realtime.test.js`              | ⏳       |
| T6  | Konfirmasi Sudah Beres lewat Kode Lacak                                     | ✅ `flows.test.js`                               | ⏳       |
| T7  | Dukung, rating, atau tandai pelanggaran meminta login                       | ✅ `security.test.js` (semua endpoint tulis 401) | ⏳       |

## User (login)

| #   | Langkah                                                             | Backend (bukti)                                       | Tampilan |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| U1  | Daftar dan login email, login Google (jika dikonfigurasi)           | ✅ `auth.test.js`                                     | ⏳       |
| U2  | Ikuti Board, atur notifikasi Semua/Berbahaya/Mati                   | ✅ `follows-members.test.js`, `notifications.test.js` | ⏳       |
| U3  | Lapor sebagai anonim, identitas tidak tampil ke publik dan Penindak | ✅ `security.test.js` privasi pelapor                 | ⏳       |
| U4  | Dukung dan beri reaksi, angka berubah tanpa refresh di tab lain     | ✅ `engagement.test.js`, `realtime.test.js`           | ⏳       |
| U5  | Beri rating Board yang diikuti, ubah lagi                           | ✅ `trust.test.js`                                    | ⏳       |
| U6  | Tandai Pelanggaran laporan dan Board                                | ✅ `moderation.test.js`                               | ⏳       |
| U7  | Lonceng notifikasi, klik membuka laporan, tandai semua dibaca       | ✅ smoke: notifikasi; `notifications.test.js`         | ⏳       |
| U8  | Laporan Saya, jawab Perlu Info, konfirmasi Sudah/Belum Beres        | ✅ `handling.test.js`, `notifications.test.js`        | ⏳       |
| U9  | Buat Board baru (mulai Komunitas, maksimal 3)                       | ✅ `boards.test.js`                                   | ⏳       |
| U10 | Akun ter-ban tidak bisa login dan melihat sisa waktu                | ✅ smoke: akun ter-ban; `moderation.test.js`          | ⏳       |

## Penindak Utama

| #   | Langkah                                                                  | Backend (bukti)                        | Tampilan |
| --- | ------------------------------------------------------------------------ | -------------------------------------- | -------- |
| P1  | Atur informasi Board, kategori, batas waktu Berbahaya                    | ✅ `boards.test.js`                    | ⏳       |
| P2  | Undang Penindak, cabut Penindak, alihkan kepemilikan                     | ✅ `follows-members.test.js`           | ⏳       |
| P3  | Antrean daftar dan kanban, laporan tamu baru muncul tanpa refresh        | ✅ smoke: antrean; `realtime.test.js`  | ⏳       |
| P4  | Proses, Minta Info, Tolak dengan alasan, Duplikat, Tandai Selesai + foto | ✅ `handling.test.js`, `flows.test.js` | ⏳       |
| P5  | Dashboard statistik 7/30/90 hari, kinerja per Penindak, ekspor CSV       | ✅ smoke: statistik; `stats.test.js`   | ⏳ (10B) |
| P6  | Riwayat verifikasi di Pengaturan Board, termasuk alasan pencabutan       | ✅ `trust.test.js`                     | ⏳       |
| P7  | Tidak bisa memberi rating Board sendiri                                  | ✅ `trust.test.js`                     | ⏳       |

## Penindak

| #   | Langkah                                                        | Backend (bukti)                                | Tampilan |
| --- | -------------------------------------------------------------- | ---------------------------------------------- | -------- |
| H1  | Terima undangan, Board muncul di Board Saya                    | ✅ `follows-members.test.js`                   | ⏳       |
| H2  | Tangani laporan seperti Penindak Utama                         | ✅ `handling.test.js`                          | ⏳       |
| H3  | Notifikasi laporan baru, Berbahaya, dibuka ulang, jawaban info | ✅ `notifications.test.js`                     | ⏳       |
| H4  | Dashboard tanpa tabel kinerja per Penindak                     | ✅ smoke: statistik tanpa kinerja per Penindak | ⏳ (10B) |
| H5  | Tidak bisa mengubah pengaturan Board                           | ✅ `boards.test.js`                            | ⏳       |

## Admin

| #   | Langkah                                                                  | Backend (bukti)                          | Tampilan |
| --- | ------------------------------------------------------------------------ | ---------------------------------------- | -------- |
| A1  | Dashboard Admin dengan statistik                                         | ✅ smoke: statistik Admin                | ⏳       |
| A2  | Antrean Moderasi (alasan terberat di atas), Pulihkan, Hapus, Hapus + Ban | ✅ smoke: antrean; `moderation.test.js`  | ⏳       |
| A3  | Tinjau tanda Board Palsu, abaikan atau bekukan (Official ikut dicabut)   | ✅ `moderation.test.js`, `trust.test.js` | ⏳       |
| A4  | Daftar ban dan cabut ban, Kelola User, Audit Log                         | ✅ `moderation.test.js`                  | ⏳       |
| A5  | Tidak bisa membuka Dashboard Verifikasi                                  | ✅ smoke: Admin ditolak di Admin Board   | ⏳       |

## Admin Board

| #   | Langkah                                                                        | Backend (bukti)                                               | Tampilan |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------- |
| B1  | Buka Dashboard Verifikasi, antrean berisi Kampus ITS dan Pondok Jati RW 03     | ✅ smoke: antrean kandidat                                    | ⏳       |
| B2  | Buka detail kandidat: checklist syarat, sebaran bintang, statistik, riwayat    | ✅ `trust.test.js`                                            | ⏳       |
| B3  | Jadikan Official (catatan wajib), badge di halaman Board berubah tanpa refresh | ✅ `flows.test.js`, `notifications.test.js` (Fase 9 realtime) | ⏳       |
| B4  | Lewati kandidat, hilang dari antrean selama 30 hari                            | ✅ `trust.test.js`                                            | ⏳       |
| B5  | Cabut Official dengan alasan minimal 10 karakter                               | ✅ `trust.test.js`                                            | ⏳       |
| B6  | Tab Official dengan filter Perlu Ditinjau Ulang                                | ✅ `trust.test.js`                                            | ⏳       |
| B7  | Gubeng berlabel Terpercaya tapi tidak masuk antrean (rating di bawah 20)       | ✅ data demo, checklist syarat                                | ⏳       |
| B8  | Tidak bisa membuka Panel Admin                                                 | ✅ `moderation.test.js`                                       | ⏳       |

## Keamanan dan performa

| #   | Pemeriksaan                                                                | Hasil                                                                                         |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| S1  | Semua endpoint tulis punya cek login atau hak akses di server              | ✅ `security.test.js` memeriksa seluruh route; hanya 5 endpoint publik yang memang untuk tamu |
| S2  | Data pribadi pelapor anonim dan tamu tidak bocor ke publik dan Penindak    | ✅ `security.test.js` (detail, daftar Board, feed, antrean)                                   |
| S3  | Header keamanan (CSP, nosniff, HSTS), tanpa `x-powered-by`                 | ✅ `security.test.js`, smoke                                                                  |
| S4  | Cookie session httpOnly, SameSite Lax, Secure di production                | ✅ `security.test.js`, smoke production                                                       |
| S5  | Permintaan tulis dari situs lain ditolak (CSRF)                            | ✅ `security.test.js`                                                                         |
| S6  | Rate limit aktif (global dan endpoint sensitif)                            | ✅ header `RateLimit`, `auth.test.js` (429)                                                   |
| S7  | Env production divalidasi (secret contoh, https, folder upload, Turnstile) | ✅ `reports.unit.test.js`                                                                     |
| S8  | Feed dan daftar Board tanpa N+1 query                                      | ✅ `performance.test.js` (jumlah query sama untuk 3 dan 20 laporan)                           |
| S9  | Index untuk feed, antrean, pencarian, notifikasi                           | ✅ `performance.test.js` (EXPLAIN)                                                            |
| S10 | Deploy satu link menyajikan frontend dan API                               | ✅ smoke production lokal 13/13                                                               |

## Cara mengulang

```bash
npm test
npm run smoke -- http://localhost:3000
```

`npm run smoke` butuh data demo (`npm run db:seed:demo`).
