# Data dan Akun Demo T!indak

Data ini dibuat oleh `npm run db:seed:demo` (`server/prisma/seed-demo.js`) dan **hanya untuk lingkungan demo**. Jangan pakai password ini untuk akun sungguhan.

## Menjalankan

```bash
npm run db:deploy
npm run db:seed:demo
```

Seed demo menolak berjalan jika database sudah berisi data. Untuk mengosongkan database lalu mengisi ulang data demo (semua data lama **terhapus**):

```bash
npm run db:seed:demo -- --reset
```

Data dibuat dengan angka acak yang selalu sama, jadi hasilnya identik setiap kali dijalankan. Tanggal laporan dihitung mundur dari waktu seed dijalankan.

## Akun

Semua akun memakai password **`demo1234`**.

| Role                     | Email                                                 | Nama              | Dipakai untuk                                     |
| ------------------------ | ----------------------------------------------------- | ----------------- | ------------------------------------------------- |
| Admin (moderator)        | `admin@demo.test`                                     | Rina Moderator    | Panel Admin, antrean moderasi, ban, bekukan Board |
| Admin Board (verifikasi) | `adminboard@demo.test`                                | Dimas Verifikator | Dashboard Verifikasi, Jadikan Official            |
| Penindak Utama           | `ratna@demo.test`                                     | Bu Ratna Dewi     | Jalan Ahmad Yani Surabaya (Official)              |
| Penindak                 | `maya@demo.test`                                      | Maya Anggraini    | Penindak di Jalan Ahmad Yani Surabaya             |
| Penindak Utama           | `hadi@demo.test`                                      | Pak Hadi Santoso  | SMAN 5 Surabaya (Official)                        |
| Penindak Utama           | `andi@demo.test`                                      | Andi Wijaya       | Kampus ITS Sukolilo (kandidat Official)           |
| Penindak Utama           | `dewi@demo.test`                                      | Dewi Lestari      | Perumahan Pondok Jati RW 03 (kandidat Official)   |
| Penindak Utama           | `sari@demo.test`                                      | Sari Rahmawati    | Kantor Kelurahan Gubeng                           |
| Penindak Utama           | `bayu@demo.test`                                      | Bayu Saputra      | Alun-Alun Sidoarjo (Official pernah dicabut)      |
| Penindak Utama           | `yoga@demo.test`                                      | Yoga Pratama      | Jl. A. Yani Surabaya (Perlu Waspada)              |
| Penindak Utama           | `nanda@demo.test`                                     | Nanda Putri       | Taman Bungkul Surabaya (Baru)                     |
| Penindak                 | `joko@demo.test`, `bayu@demo.test`, `nanda@demo.test` | -                 | Penindak di SMAN 5, Kampus ITS, Pondok Jati       |
| User                     | `siti@demo.test`                                      | Siti Aminah       | Warga yang mengikuti Board dan punya notifikasi   |
| User                     | `rudi@demo.test`                                      | Rudi Hartono      | Warga biasa                                       |
| User (30 akun)           | `warga01@demo.test` s.d. `warga30@demo.test`          | Warga 01 dst      | Pemberi rating, dukungan, dan reaksi              |
| User ter-ban             | `spam@demo.test`                                      | Akun Spam         | Contoh akun yang ditolak saat login               |

Tamu tidak butuh akun. Kode Lacak demo: **`TRACK234`** dengan secret **`demo-lacak-tindak`**, buka `/lacak/TRACK234?secret=demo-lacak-tindak`.

## Board

| Board                       | Kota     | Jenis          | Pengelola                          | Status    | Label kepercayaan           | Fungsi di demo                                                    |
| --------------------------- | -------- | -------------- | ---------------------------------- | --------- | --------------------------- | ----------------------------------------------------------------- |
| SMAN 5 Surabaya             | Surabaya | Sekolah        | Pihak Resmi (Wakasek Sarpras)      | Official  | Terpercaya (sekitar 4,7)    | Board Official dengan riwayat verifikasi                          |
| Jalan Ahmad Yani Surabaya   | Surabaya | Jalan          | Pihak Resmi (Kasi Pemeliharaan)    | Official  | Terpercaya (sekitar 4,6)    | Board resmi pada pasangan nama mirip                              |
| Jl. A. Yani Surabaya        | Surabaya | Jalan          | Relawan (tanpa jabatan)            | Komunitas | Perlu Waspada (sekitar 1,6) | Pasangan nama mirip, banyak laporan ditolak, ditandai Board Palsu |
| Kampus ITS Sukolilo         | Surabaya | Kampus         | Relawan BEM                        | Komunitas | Terpercaya (sekitar 4,6)    | Kandidat Official #1 (24 rating)                                  |
| Perumahan Pondok Jati RW 03 | Sidoarjo | RT/RW          | Pihak Resmi (Ketua RW 03)          | Komunitas | Terpercaya (sekitar 4,6)    | Kandidat Official #2 (21 rating)                                  |
| Kantor Kelurahan Gubeng     | Surabaya | Kantor         | Pihak Resmi (Sekretaris Kelurahan) | Komunitas | Terpercaya (sekitar 4,6)    | Skor tinggi tapi baru 12 rating: Terpercaya bukan Official        |
| Alun-Alun Sidoarjo          | Sidoarjo | Fasilitas umum | Relawan                            | Komunitas | Netral (sekitar 3,3)        | Official pernah dicabut dengan alasan                             |
| Taman Bungkul Surabaya      | Surabaya | Fasilitas umum | Relawan (tanpa jabatan)            | Komunitas | Baru                        | Board baru, berisi 1 laporan yang disembunyikan karena spam       |

Skor pasti dihitung ulang oleh server dari rating dan tingkat tanggap, jadi angka di atas bisa berbeda sedikit.

## Isi lainnya

- 81 laporan tersebar sekitar 60 hari terakhir: semua status (Baru, Perlu Info, Diproses, Menunggu Konfirmasi, Selesai, Dibuka Ulang, Ditolak dengan alasan, Duplikat), semua tingkat bahaya, beberapa laporan Berbahaya terlambat, laporan dari tamu dan anonim, foto sebelum dan sesudah.
- Dukungan, reaksi, pengikut Board, dan rating dari 30 akun warga.
- Notifikasi untuk Bu Ratna, Siti, Pak Hadi, Bayu, dan Admin Board.
- Antrean moderasi berisi 2 item: tanda Board Palsu untuk Jl. A. Yani Surabaya dan laporan spam di Taman Bungkul.
- Akun `spam@demo.test` sedang di-ban 7 hari.

## Foto

Foto laporan adalah ilustrasi yang digambar oleh `server/scripts/generate-demo-photos.js` dan disimpan di `server/prisma/demo-photos/`. Dibuat sendiri oleh tim, bebas dipakai (CC0), tanpa materi pihak ketiga. Untuk mengganti dengan foto asli, timpa file JPG dengan nama yang sama lalu jalankan ulang seed demo.
