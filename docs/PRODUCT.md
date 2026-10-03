*📢 ALUR WEBSITE T!INDAK*
_Board pengaduan masalah fisik berbasis komunitas_

*💡 KONSEP SINGKAT*
- T!indak itu seperti Reddit, tapi khusus laporan masalah fisik: jalan rusak, sampah, toilet rusak, lampu mati, dll.
- Pengganti subreddit namanya *Room*. Contoh: "Jalan Rungkut Madya", "SMKN 1 Surabaya".
- Room *terbuka*. Cari saja namanya, tidak pakai kode.
- *Tidak ada komentar*. Interaksi cuma dukung (⬆️) dan reaksi (🚨 ⏳ 😤).
- Fokus di *web desktop*. Tapi halaman lapor dan lacak tetap harus enak dipakai di HP.

*🔑 LOGIN*
- Bisa pakai *email + password* atau *Google*.
- Lapor *tidak wajib login*.
- Dukung, reaksi, ikuti room, rating, dan tandai pelanggaran *wajib login*.

━━━━━━━━━━━━━━━

*👥 ROLE*

*1. Tamu (belum login)*
- Bisa lihat beranda, cari room, baca laporan.
- Bisa bikin laporan. Wajib centang captcha. Maks 3 laporan per hari.
- Laporannya otomatis anonim.
- Dapat *Kode Lacak* untuk pantau laporan.
- Tidak bisa dukung, reaksi, ikuti room, rating, atau tandai pelanggaran.

*2. User (sudah login)*
- Semua yang bisa dilakukan Tamu.
- Plus: dukung, reaksi, ikuti room, kasih rating room, tandai pelanggaran.
- Bisa pilih lapor sebagai anonim.
- Maks 5 laporan per hari.
- Bisa bikin room (maks 3 room).

*3. Penindak Utama*
- User yang bikin room otomatis jadi Penindak Utama.
- Bisa atur room dan undang Penindak lain.
- Bisa ubah status laporan.
- Bisa alihkan kepemilikan room ke Penindak lain.

*4. Penindak*
- User yang diundang Penindak Utama.
- Tugasnya menangani laporan.
- Tidak bisa ubah pengaturan room atau undang orang.

*5. Admin*
- Moderator seluruh website.
- Tinjau konten yang ditandai, hapus, dan ban.
- Admin *tidak* menangani laporan. Itu tugas Penindak.

*⚠️ Catatan penting*
- Role disimpan *per room*, bukan per akun. Jadi satu orang bisa jadi Penindak di room A, tapi jadi user biasa di room B.
- Penindak tidak boleh kasih rating ke room-nya sendiri.

*🏠 SISTEM ROOM*

*Cara bikin room*
1. Login, klik "Buat Room".
2. Isi form:
   • Nama room (wajib). Contoh: "Jalan Rungkut Madya"
   • Kota (wajib). Biar beda antara Jl. A. Yani Surabaya dan Jl. A. Yani Sidoarjo
   • Jenis: Sekolah, Kampus, Kantor, Jalan, Wilayah (RT/RW/Kelurahan), Fasilitas Umum, Lainnya
   • Status pengelola: *Pihak Resmi* (kepsek, HR, ketua RT, OSIS) atau *Relawan/Komunitas*
   • Jabatan (opsional). Contoh: "Wakasek Sarpras"
   • Deskripsi dan cakupan room
   • Foto sampul (opsional)
   • Kategori laporan. Sudah terisi otomatis sesuai jenis room, bisa ditambah
   • Target waktu penanganan laporan Berbahaya. Default 48 jam
3. Saat ngetik nama, muncul daftar room yang mirip di kota yang sama. Ini cuma peringatan, bukan larangan.
4. Room langsung aktif tanpa persetujuan Admin.

*Kategori otomatis per jenis room*
- Sekolah, Kampus, Kantor: Kebersihan, Kerusakan Fasilitas, Listrik, Air dan Sanitasi, Keamanan, Lainnya
- Jalan: Jalan Berlubang, Lampu Jalan, Drainase dan Banjir, Rambu dan Marka, Pohon Tumbang, Lainnya
- Wilayah, Fasilitas Umum: Sampah, Drainase, Penerangan, Fasilitas Rusak, Keamanan, Lainnya

*Cara cari room*
- Ada kolom pencarian di header setiap halaman.
- Hasilnya berupa kartu room: nama, kota, jenis, Resmi/Relawan, skor kepercayaan, jumlah pengikut, jumlah laporan aktif.
- Urutan: nama paling cocok, lalu skor kepercayaan, lalu yang paling aktif.
- Bisa difilter per kota, jenis, dan status pengelola.

*Kalau ada 2 room dengan nama sama?*
Tidak apa-apa. User yang menilai lewat rating. Room yang tidak tanggap akan turun sendiri di hasil pencarian.

*Room terbengkalai*
- Kalau Penindak tidak aktif 30 hari, room dapat label 💤 Tidak Aktif.
- Orang tetap bisa lapor, tapi muncul peringatan di form.

*Tambah Penindak*
1. Penindak Utama buka menu Kelola Penindak.
2. Cari user lewat email.
3. User dapat undangan di notifikasi, lalu terima atau tolak.
4. Penindak Utama bisa cabut Penindak kapan saja.

━━━━━━━━━━━━━━━

*⭐ SISTEM RATING ROOM*
Tujuannya: user bisa tahu room ini bisa dipercaya atau tidak.

*Siapa yang boleh kasih rating?*
- User yang sudah login.
- Sudah ikuti room minimal 24 jam, ATAU pernah lapor di room itu saat login.
- Bukan Penindak di room itu.
- 1 user cuma bisa kasih 1 rating per room. Bisa diubah tiap 7 hari.

*Isi rating*
- Bintang 1 sampai 5 (wajib)
- Pilihan cepat (opsional): 👍 Tanggap, 🐢 Lambat, ❓ Diragukan

*Skor Kepercayaan dihitung dari 2 hal*
1. Rating bintang dari user (bobot 60%)
2. Tingkat Tanggap = berapa persen laporan yang sudah disentuh Penindak dalam 7 hari (bobot 40%)

Rumus rating dibuat supaya room dengan 1 atau 2 rating bintang 5 tidak langsung kelihatan sempurna. Room butuh banyak rating dulu.

_Untuk backend:_
Rating Tertimbang = (15 + total bintang) ÷ (5 + jumlah rating)
Skor = (0,6 × Rating Tertimbang) + (0,4 × Tingkat Tanggap × 5)

*Label room*
- 🆕 Baru = kurang dari 5 rating
- ✅ Terpercaya = skor 4,0 ke atas
- Tanpa label = skor 2,5 sampai 3,9
- ⚠️ Perlu Waspada = skor di bawah 2,5
- 💤 Tidak Aktif = Penindak tidak aktif 30 hari

*Pertahanan dari room palsu*
- Penindak *tidak bisa hapus laporan*. Laporan yang ditolak tetap tampil beserta alasannya.
- Persentase laporan ditolak tampil di halaman room.
- User bisa tandai room sebagai "Room Palsu", nanti dicek Admin.


*📝 ALUR LAPORAN*

*Isi form laporan*
- Room (otomatis terisi kalau dibuka dari halaman room)
- Judul, maks 100 karakter (wajib)
- Kategori (wajib)
- Tingkat bahaya: Rendah, Sedang, Berbahaya (wajib)
- Detail lokasi, teks bebas (wajib). Contoh: "Depan Indomaret Rungkut Madya" atau "Gedung B lantai 2, toilet putra"
- Deskripsi, min 20 karakter (wajib)
- Foto, min 1 maks 4, maks 5 MB per foto (wajib)
- Centang "Kirim sebagai Anonim" (khusus user login, tamu otomatis anonim)
- Captcha centang (wajib)

_Tidak pakai GPS._

*Captcha*
Pakai *Cloudflare Turnstile* (gratis, cukup centang). Alternatif: Google reCAPTCHA v2. Muncul setiap kirim laporan.

*Batas laporan*
- Tamu: 3 per hari per perangkat. Jeda 2 menit.
- Satu jaringan wifi: maks 30 laporan per hari.
- User login: 5 per hari. Jeda 1 menit.

_Kenapa tidak dibatasi per IP saja? Karena wifi sekolah/kantor dipakai ratusan orang dengan 1 IP. Kalau limit 3 per IP, tamu ke-4 di sekolah itu langsung keblokir._

*Yang terjadi saat laporan dikirim (backend)*
1. Cek captcha
2. Cek apakah pelapor kena ban
3. Cek batas laporan
4. Hapus data lokasi tersembunyi di foto (EXIF)
5. Kompres foto
6. Scan foto NSFW
7. Simpan laporan, status *Baru*
8. Pelapor otomatis dihitung 1 dukungan
9. Kirim notifikasi ke Penindak room
10. Tamu dapat Kode Lacak

━━━━━━━━━━━━━━━

*🔍 KODE LACAK (khusus tamu)*
- Contoh: TND-K7M2P9QX
- Ada link rahasia: tindak.id/lacak/K7M2P9QX
- Tersimpan otomatis di browser, jadi tamu bisa buka halaman "Laporan di Perangkat Ini".
- Halaman sukses ada tombol "Salin Kode" dan peringatan untuk menyimpan kode.
- Tamu pakai kode ini untuk cek status, jawab pertanyaan Penindak, dan konfirmasi selesai.

━━━━━━━━━━━━━━━

*🔄 STATUS LAPORAN*
🆕 *Baru* = laporan baru masuk
❔ *Perlu Info* = Penindak butuh info tambahan
🔧 *Diproses* = sedang ditangani
⏳ *Menunggu Konfirmasi* = Penindak bilang sudah beres, tunggu pelapor
✅ *Selesai* = pelapor setuju sudah beres
🔁 *Dibuka Ulang* = pelapor bilang belum beres
❌ *Ditolak* = wajib ada alasan
🔗 *Duplikat* = sudah ada laporan yang sama

*Alur status*
Baru → Diproses → Menunggu Konfirmasi → Selesai

Cabang:
- Baru → Perlu Info → (dijawab) → Baru
- Baru → Ditolak
- Baru → Duplikat
- Menunggu Konfirmasi → Dibuka Ulang → Diproses

*Alasan penolakan (pilih salah satu)*
- Bukan masalah fisik/fasilitas
- Di luar cakupan room
- Informasi tidak cukup
- Laporan tidak benar
- Lainnya (wajib tulis catatan)

━━━━━━━━━━━━━━━

*❔ PERLU INFO (pengganti komentar)*
1. Penindak tulis pertanyaan. Status jadi Perlu Info.
2. Pelapor jawab 1 kali saja.
3. Status balik ke Baru.
4. Kalau 7 hari tidak dijawab, Penindak boleh tolak dengan alasan "Informasi tidak cukup".

*✅ KONFIRMASI SELESAI*
1. Penindak klik "Tandai Selesai", *wajib upload foto sesudah* dan tulis catatan.
2. Status jadi Menunggu Konfirmasi.
3. Pelapor lihat foto sebelum dan sesudah berdampingan.
4. Pelapor pilih:
   • "Sudah Beres" → Selesai
   • "Belum Beres" → Dibuka Ulang (wajib alasan, boleh tambah foto)
5. Kalau 3 hari tidak ada respons → otomatis Selesai, dengan label "Dikonfirmasi otomatis".
6. Maks 2 kali Dibuka Ulang. Setelah itu muncul label "Pelapor tidak puas".

*🔗 DUPLIKAT*
1. Penindak klik "Tandai Duplikat".
2. Pilih laporan induknya.
3. Laporan duplikat menampilkan link ke laporan induk.
4. Pelapor duplikat dapat notifikasi.

*⏰ BATAS WAKTU (hanya laporan Berbahaya)*
- Diatur Penindak Utama. Default 48 jam.
- Kalau lewat, muncul label merah "⏰ Terlambat" yang bisa dilihat semua orang.
- Laporan Rendah dan Sedang tidak ada batas waktu.

*📜 TIMELINE*
Setiap laporan punya riwayat yang tidak bisa diedit. Contoh:
2 Okt 08.14 Laporan dibuat oleh Anonim (Tamu)
2 Okt 10.30 Diproses oleh Pak Hadi
3 Okt 15.02 Ditandai selesai + foto sesudah
4 Okt 07.45 Dikonfirmasi selesai oleh pelapor

*👍 DUKUNGAN DAN REAKSI*
_Wajib login_

*Daftar aksi*
⬆️ *Dukung* = "Saya juga mengalami ini" (poin 1)
🚨 *Berbahaya* = bisa melukai orang (poin 3)
⏳ *Sudah Lama* = masalah dibiarkan lama (poin 2)
😤 *Mengganggu* = mengganggu aktivitas (poin 1)

*Aturan*
- 1 user = 1 dukungan per laporan. Bisa ditarik.
- 1 user = 1 reaksi per laporan. Bisa diganti atau ditarik.
- Dukung dan reaksi boleh barengan.
- Pelapor tidak bisa dukung laporannya sendiri (sudah otomatis dihitung 1).
- Terkunci kalau status Selesai, Ditolak, atau Duplikat.
- Nama pemberi dukungan tidak tampil, cuma jumlahnya.

*Alur reaksi di UI*
1. Di bawah laporan ada tombol ⬆️ Dukung dan tombol 😊 Reaksi.
2. Klik Reaksi, muncul 3 emoji dengan label di bawahnya.
3. Arahkan kursor ke emoji, muncul penjelasan singkat.
4. Klik satu emoji, tombol berubah jadi emoji itu dengan warna aktif.
5. Klik emoji yang sama untuk batal. Klik emoji lain untuk ganti.
6. Jumlah tampil di samping emoji. Contoh: 🚨 12 · ⏳ 5 · 😤 8

*Kalau tamu klik Dukung/Reaksi*
Muncul pop-up "Masuk untuk mendukung laporan ini" dengan pilihan email atau Google. Setelah login, balik ke laporan yang sama dan aksinya langsung tercatat.

━━━━━━━━━━━━━━━

*🎯 SKOR PRIORITAS*
Supaya laporan berbahaya tetap di atas walaupun dukungannya sedikit.

Skor = Dukungan + (🚨 × 3) + (⏳ × 2) + 😤 + Bobot Bahaya + (Hari belum selesai × 2)

Bobot Bahaya: Rendah 0, Sedang 10, Berbahaya 30

Contoh:
- Lubang besar, Berbahaya, 5 dukungan, 4 reaksi 🚨, 3 hari = *53*
- Lampu taman mati, Rendah, 30 dukungan, 2 reaksi 😤, 1 hari = *34*
Lubang besar tetap di atas.

*Urutan feed*
🔥 *Ramai* = paling banyak dukungan dan reaksi 48 jam terakhir (default untuk user)
🎯 *Prioritas* = skor prioritas (default untuk Penindak)
🆕 *Terbaru*
✅ *Selesai* = bukti kinerja room

*Beranda*
- Tamu atau user baru: laporan paling ramai dari semua room + room populer.
- User yang sudah ikuti room: ada tab "Diikuti" dan tab "Ramai".

━━━━━━━━━━━━━━━

*🛡️ KEAMANAN DAN MODERASI*
_Istilah: "Laporan" = pengaduan. "Tandai Pelanggaran" = fitur report konten._

*Lapis 1: Sebelum laporan masuk*
Captcha, batas laporan, cek ban.

*Lapis 2: Scan foto otomatis*
- Pakai library gratis *nsfwjs* di server.
- Skor tinggi → foto ditolak.
- Skor sedang → foto diburamkan, masuk antrean Admin.
- Skor rendah → lolos.
_Ini penting karena tamu anonim bisa upload apa saja. Kalau waktu mepet, lapis ini boleh dilepas._

*Lapis 3: Tandai Pelanggaran (wajib login)*
Alasan yang bisa dipilih:
🔞 Konten seksual
🩸 Kekerasan
🗯️ SARA/ujaran kebencian
👤 Menyerang atau menyebut nama orang
📢 Spam/iklan
🚫 Bukan pengaduan masalah fisik
🏚️ Room palsu (khusus room)
Maks 20 tanda per akun per hari.

*Lapis 4: Sembunyi otomatis*
Laporan langsung disembunyikan kalau:
- 2 akun tandai sebagai konten seksual/kekerasan, ATAU
- 3 akun tandai dengan alasan lain, ATAU
- 1 Penindak room itu menandai
Tampilannya jadi kartu abu-abu "Sedang ditinjau moderator".

_Kalau Penindak menyembunyikan laporan yang ternyata sah, lalu dipulihkan Admin, jumlahnya tampil di halaman room. Jadi Penindak tidak bisa sembarangan._

*Lapis 5: Admin meninjau*
Admin lihat: isi laporan, alasan tanda, skor NSFW, pelapor akun atau tamu, IP tersamar, riwayat pelaku.
Pilihan Admin: *Pulihkan*, *Hapus*, atau *Hapus + Ban*.

*Lapis 6: Ban*
- Akun: 1 hari, 7 hari, 30 hari, permanen
- Perangkat tamu: 1 hari, 7 hari, 30 hari, permanen
- IP: 1 hari atau 7 hari saja (karena IP sering dipakai bareng satu sekolah/kantor)

*Penyimpanan IP*
- IP disimpan dalam bentuk acak (hash), bukan IP asli.
- Ban tetap jalan dengan mencocokkan hash.
- Dihapus otomatis setelah 90 hari.

*Penanda penyalahguna*
Akun yang 5 tandanya ditolak Admin dalam 30 hari, tandanya tidak dihitung lagi untuk sembunyi otomatis.

━━━━━━━━━━━━━━━

*🔔 NOTIFIKASI*

*Untuk pelapor (login)*
- Status laporan berubah
- Penindak minta info
- Laporan ditandai duplikat
- Laporan disembunyikan/dihapus
- Laporan dapat 10, 25, 50 dukungan

*Untuk pendukung*
- Laporan yang didukung selesai

*Untuk pengikut room*
- Laporan baru (bisa diatur: semua, hanya Berbahaya, atau mati)

*Untuk Penindak*
- Laporan baru
- Laporan Berbahaya (tampil merah di atas)
- Laporan Berbahaya hampir lewat batas waktu (6 jam sebelumnya)
- Laporan Dibuka Ulang
- Jawaban Perlu Info masuk
- Ringkasan rating harian

*Untuk tamu*
Cek di halaman Lacak.

*Realtime*
Pakai Socket.IO. Jumlah dukungan, status, dan antrean Penindak berubah tanpa refresh.

*🚶 ALUR PER ROLE*

*👤 TAMU*
_Melihat_
1. Buka website, masuk Beranda.
2. Ketik nama room, misal "Rungkut".
3. Pilih room. Bandingkan skor dan status Resmi/Relawan.
4. Lihat feed dan info room.
5. Klik laporan untuk lihat detail.

_Melapor_
1. Di halaman room, klik "Laporkan Masalah".
2. Isi form, centang captcha, kirim.
3. Simpan Kode Lacak.

_Memantau_
1. Klik "Lacak Laporan" di header, masukkan kode.
2. Lihat status dan timeline.
3. Kalau Perlu Info, jawab di halaman lacak.
4. Kalau Menunggu Konfirmasi, pilih Sudah Beres atau Belum Beres.

━━━━━━━━━━━━━━━

*🙋 USER*
_Masuk_
1. Daftar atau login (email + password atau Google).
2. Login pertama kali: muncul halaman sambutan + rekomendasi room.

_Ikuti room_
1. Cari room, klik "Ikuti".
2. Laporan room itu masuk ke tab Diikuti.
3. Atur notifikasi per room.

_Lapor dan interaksi_
1. Lapor seperti tamu, plus bisa pilih anonim.
2. Dukung dan kasih reaksi.
3. Tandai pelanggaran.
4. Kasih rating room.
5. Pantau di halaman "Laporan Saya" dan notifikasi.

━━━━━━━━━━━━━━━

*🛠️ PENINDAK*
_Bikin room_
1. Login, klik "Buat Room", isi form.
2. Room aktif, masuk Dashboard Room.
3. Bagikan link room ke warga/siswa/karyawan.

_Siapkan tim_
1. Undang Penindak lain.
2. Atur kategori dan batas waktu Berbahaya.

_Tangani laporan_
1. Dapat notifikasi laporan baru.
2. Buka Antrean (bisa tampilan daftar atau kanban), urutkan Prioritas.
3. Pilih aksi: Proses, Minta Info, Tandai Duplikat, Tolak, atau Tandai Pelanggaran.
4. Perbaiki masalahnya di lapangan.
5. Klik "Tandai Selesai" + foto sesudah.
6. Tunggu konfirmasi pelapor.

_Evaluasi_
Lihat statistik: jumlah per status, rata-rata waktu penanganan, tingkat tanggap, laporan Berbahaya terlambat, grafik kategori, tren mingguan, rating.

━━━━━━━━━━━━━━━

*🧑‍⚖️ ADMIN*
1. Login dengan akun Admin.
2. Lihat Dashboard Admin.
3. Buka Antrean Moderasi (alasan paling berat di atas).
4. Pulihkan, Hapus, atau Hapus + Ban.
5. Tinjau laporan "Room Palsu": abaikan, beri peringatan, atau bekukan room.
6. Kelola daftar ban dan lihat riwayat aksi.

━━━━━━━━━━━━━━━

*📄 DAFTAR HALAMAN*

*Publik (tamu dan user)*
1. Beranda
2. Hasil Pencarian Room
3. Halaman Room
4. Detail Laporan
5. Buat Laporan
6. Laporan Terkirim (Kode Lacak)
7. Lacak Laporan
8. Laporan di Perangkat Ini
9. Login
10. Daftar
11. Lupa Password
12. Tentang dan Cara Kerja
13. Aturan Komunitas
14. Kebijakan Privasi

*User login*
15. Halaman Sambutan
16. Beranda (tab Diikuti dan Ramai)
17. Laporan Saya
18. Room Diikuti
19. Notifikasi
20. Profil

*Penindak*
21. Buat Room
22. Dashboard Room
23. Antrean Laporan (daftar dan kanban)
24. Detail Laporan versi Penindak (ada panel aksi)
25. Statistik Room
26. Pengaturan Room
27. Kelola Penindak

*Admin*
28. Dashboard Admin
29. Antrean Moderasi
30. Daftar Ban
31. Kelola Room
32. Kelola User
33. Riwayat Aksi (Audit Log)

*Komponen yang muncul di banyak halaman*
- Header: logo, pencarian room, tombol "+ Lapor", Lacak Laporan, lonceng notifikasi, avatar atau tombol Masuk
- Pop-up Login
- Pop-up Tandai Pelanggaran
- Pop-up Rating Room

━━━━━━━━━━━━━━━

*🖥️ LAYOUT DESKTOP (3 kolom seperti Reddit)*
- *Kiri*: menu (Beranda, Ramai, Laporan Saya) + daftar room yang diikuti
- *Tengah*: tab urutan (Ramai, Prioritas, Terbaru, Selesai) + kartu laporan
- *Kanan*: info room (nama, kota, Resmi/Relawan, skor, pengikut, tingkat tanggap, persentase ditolak, tombol Ikuti dan Rating, jumlah Penindak, aturan room)

*Isi kartu laporan*
Label bahaya, label status, judul, foto, lokasi, waktu, tombol ⬆️ Dukung, dan jumlah 🚨 ⏳ 😤

_Lebar desain utama minimal 1280px. Halaman Buat Laporan dan Lacak tetap harus rapi di HP._