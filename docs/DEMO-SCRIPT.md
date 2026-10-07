# Naskah Demo T!indak (sekitar 6 menit)

Batas video 7 menit. Naskah ini sekitar 6 menit, jadi masih ada sisa untuk pembukaan dan penutup. Semua akun memakai password `demo1234` (daftar lengkap di `docs/DEMO.md`).

## Persiapan sebelum merekam

- Database demo kosong dan sudah dimigrasikan: `npm run db:deploy`, lalu `npm run db:seed:demo`.
- Jika mengulang rekaman, `npm run db:seed:demo -- --reset` menghapus seluruh data di database tujuan. Jalankan hanya pada database demo sekali pakai.
- **Browser A** (Chrome biasa) dan **Browser B** (jendela Incognito), berdampingan.
- Siapkan satu foto jalan rusak di komputer untuk diunggah.
- Tutup notifikasi sistem dan tab lain.

## Adegan

| Waktu     | Adegan                          | Browser dan akun                      | Yang dilakukan dan diucapkan                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Masalah dan solusi              | A, tamu                               | Buka beranda. "Jalan rusak, sampah, fasilitas sekolah rusak sering tidak tahu harus lapor ke siapa. T!indak adalah board pengaduan masalah fisik, mirip Reddit: setiap tempat punya Board." Tunjukkan feed Ramai.                                                                                                                                                                                                                                                 |
| 0:30–1:15 | Cari Board dan kepercayaan      | A, tamu                               | Ketik "Yani" di pencarian. "Ada dua Board bernama mirip." Tunjukkan **Jalan Ahmad Yani Surabaya** (centang Official, skor sekitar 4,6) di atas **Jl. A. Yani Surabaya** (⚠️ Perlu Waspada, banyak laporan ditolak). "Warga bisa membedakan mana yang benar-benar menindaklanjuti."                                                                                                                                                                                |
| 1:15–2:00 | Lapor tanpa login               | A, tamu                               | Buka Jalan Ahmad Yani Surabaya → Laporkan Masalah. Isi judul, kategori Jalan Berlubang, pilih 🚨 Berbahaya, unggah foto, lokasi, kirim. Tunjukkan **Kode Lacak**. "Tamu tidak perlu akun." Buka halaman Lacak dan biarkan terbuka.                                                                                                                                                                                                                                |
| 2:00–3:00 | Penindak menangani, realtime    | B, `ratna@demo.test` (Penindak Utama) | Lonceng 🔔 bertambah: laporan Berbahaya baru. Buka **Antrean** (kanban): laporan muncul tanpa refresh. Klik **Proses**. Pindah ke Browser A: status di halaman Lacak berubah menjadi Diproses **tanpa refresh**.                                                                                                                                                                                                                                                  |
| 3:00–3:30 | Dashboard Penindak              | B, `ratna@demo.test`                  | Buka Dashboard Board: jumlah per status, rata-rata waktu penanganan, Berbahaya tepat waktu, grafik kategori dan tren mingguan. "Penindak bisa mengevaluasi kinerjanya."                                                                                                                                                                                                                                                                                           |
| 3:30–4:00 | Warga: dukung, rating           | A, `siti@demo.test`                   | Login sebagai Siti. Dukung laporan tadi dan beri reaksi 🚨. Buka Board Kantor Kelurahan Gubeng: label ✅ Terpercaya tapi **belum Official**, karena rating baru 12. "Terpercaya dihitung otomatis, Official diputuskan manusia."                                                                                                                                                                                                                                  |
| 4:00–5:15 | Admin Board menjadikan Official | B, `adminboard@demo.test`             | Buka **Dashboard Verifikasi**. Antrean kandidat berisi Kampus ITS Sukolilo dan Perumahan Pondok Jati RW 03. Buka **Kampus ITS Sukolilo**: checklist syarat semua ✓, sebaran bintang, tingkat tanggap, riwayat. Klik **Jadikan Official**, tulis catatan, konfirmasi. Di Browser A buka halaman Kampus ITS Sukolilo sebelum menekan: **badge Official muncul tanpa refresh**. Sebutkan juga Alun-Alun Sidoarjo yang Official-nya pernah dicabut beserta alasannya. |
| 5:15–6:00 | Moderasi                        | B, `admin@demo.test`                  | Buka **Panel Admin → Antrean Moderasi**: laporan spam yang otomatis disembunyikan karena 3 tanda, dan tanda "Board Palsu" untuk Jl. A. Yani. Klik **Hapus + Ban** pada laporan spam. Penutup: "Admin menjaga konten, Admin Board menjaga kepercayaan Board, dan warga ikut menilai."                                                                                                                                                                              |

## Cadangan jika waktu tersisa

- Dua tab sebagai warga yang berbeda: jumlah dukungan bertambah tanpa refresh.
- Ekspor CSV dari Dashboard Board.
- Login `spam@demo.test`: ditolak dengan pesan sisa waktu ban.

## Tips

- Latih alurnya sekali sebelum merekam. Jadikan Official hanya bisa dilakukan sekali per Board. Untuk merekam ulang, isi ulang data demo atau gunakan Perumahan Pondok Jati RW 03.
- Perbesar zoom browser ke 110–125% agar teks terbaca di video.
