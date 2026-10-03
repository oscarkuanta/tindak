Jalankan FASE 4: LAPORAN DAN TAMU sesuai Protokol Fase di AGENTS.md. Bagian yang saya kerjakan: [ISI: A atau B]. Branch: feat/f4[a/b]-reports. Baca docs/PRODUCT.md bagian "Alur Laporan", "Kode Lacak", dan "Keamanan" lapis 1 dan 2.

BAGIAN A (BACKEND)
Database:
- Enum ReportSeverity (LOW, MEDIUM, DANGEROUS), ReportStatus (NEW, NEED_INFO, IN_PROGRESS, AWAITING_CONFIRMATION, RESOLVED, REOPENED, REJECTED, DUPLICATE).
- Report: id, boardId, categoryId, userId (nullable untuk tamu), isAnonymous, guestTokenHash (nullable), ipHash, title, description, locationDetail, severity, status (default NEW), trackingCode (unique, 8 karakter tanpa karakter mirip seperti 0 O 1 I L), trackingSecretHash, parentId (nullable, untuk duplikat), assigneeId (nullable), priorityScore (Int, default 0), reopenCount (default 0), isHidden (default false), dueAt (nullable, diisi hanya untuk DANGEROUS = createdAt + dangerSlaHours), resolvedAt, createdAt, updatedAt.
- ReportMedia: id, reportId, url, kind (BEFORE, AFTER, EXTRA), nsfwScore (Float nullable), isBlurred, createdAt.
Upload:
- multer (memory storage), maks 4 foto, maks 5MB, hanya jpeg, png, webp (cek magic bytes, bukan hanya ekstensi).
- sharp: hapus metadata EXIF, putar sesuai orientasi, resize maks 1600px, simpan sebagai webp di server/uploads dengan nama acak. Sajikan lewat /uploads statis.
- Simpan lewat satu modul storage agar mudah diganti ke cloud storage saat deploy.
- Scan NSFW dengan nsfwjs + @tensorflow/tfjs-node: skor Porn + Hentai > 0.7 ditolak (422 IMAGE_REJECTED), 0.4 sampai 0.7 isBlurred true dan tandai untuk antrean moderasi (simpan flag sistem, Fase 7 akan memakainya), di bawah itu lolos. Bungkus di satu modul, beri env NSFW_ENABLED agar bisa dimatikan.
Tamu dan anti-spam:
- Middleware guestToken: jika cookie "tindak.gt" belum ada, buat token acak 32 byte, cookie httpOnly 1 tahun. Simpan hanya hash-nya.
- ipHash = HMAC-SHA256(ip, IP_HASH_SECRET). Atur trust proxy dengan benar.
- Verifikasi Cloudflare Turnstile di server untuk setiap POST laporan (env TURNSTILE_SECRET_KEY, sediakan mode test key untuk development dan tes).
- Batas: tamu 3 per hari per (guestTokenHash + ipHash), maks 30 per hari per ipHash, jeda 2 menit. User login 5 per hari, jeda 1 menit. Hitung dari tabel Report, bukan memory, agar tetap berlaku setelah server restart. Error 429 dengan pesan kapan bisa lapor lagi.
- Siapkan pengecekan ban sebagai fungsi kosong yang selalu lolos (isBanned), Fase 7 akan mengisinya.
Endpoint:
- POST /api/boards/:slug/reports (optionalAuth, multipart): validasi Zod dari shared. Board FROZEN ditolak. Kategori harus milik Board. Tamu selalu anonim. Respons 201: laporan + trackingCode + trackingUrl (berisi secret, hanya dikirim sekali).
- GET /api/boards/:slug/reports?sort=new&status=&categoryId=&severity=&page= (publik): sort lain (hot, priority) disiapkan sebagai parameter yang sementara diperlakukan seperti new. Laporan isHidden tidak tampil untuk publik.
- GET /api/reports/:id (optionalAuth): detail. Pelapor anonim tampil sebagai "Anonim". Tambahkan reporterType (GUEST atau ACCOUNT) hanya untuk Penindak Board itu.
- GET /api/track/:code?secret= : status, timeline, dan detail untuk pemegang kode lacak. Secret salah: 404.
- GET /api/me/reports (requireAuth).
- Tolak penghapusan kategori yang sudah dipakai laporan (selesaikan TODO dari Fase 2A).
- Update activeReportCount di Board.
Tes: tamu lapor sukses dengan cookie token, batas tamu dan batas per IP terpicu, jeda, captcha gagal, file bukan gambar ditolak, EXIF terhapus (cek file hasil), kategori Board lain ditolak, laporan tersembunyi tidak tampil, lacak dengan secret benar dan salah. Mock nsfwjs di tes.

BAGIAN B (FRONTEND)
- /b/:slug/lapor dan tombol "Laporkan Masalah" di header (memilih Board dulu jika dibuka di luar halaman Board).
- Form: judul, kategori, tingkat bahaya (3 kartu pilihan berwarna dengan penjelasan), detail lokasi, deskripsi, unggah foto (drag and drop, pratinjau, hapus, maks 4), centang anonim (hanya user login), widget Cloudflare Turnstile.
- Peringatan di form: "Jangan menyebut nama orang. Laporkan masalah fisik saja." dan peringatan Board Tidak Aktif jika status INACTIVE.
- Halaman sukses /laporan-terkirim: kode lacak besar, tombol salin kode, tombol salin link, peringatan untuk menyimpan kode.
- Simpan daftar kode lacak di localStorage untuk halaman /laporan-perangkat-ini (bungkus try/catch).
- /lacak: input kode, lalu halaman status dengan timeline. Akses lewat link berisi secret.
- Feed laporan di halaman Board memakai data nyata: kartu laporan (label bahaya, label status, judul, foto pertama, lokasi, kategori, waktu relatif, slot tombol Dukung dan Reaksi yang belum aktif). Pagination atau infinite scroll.
- /laporan/:id: galeri foto, info lengkap, timeline (sementara satu entri "Laporan dibuat").
- /laporan-saya untuk user login.
- Halaman ini harus rapi di HP karena tamu sering melapor dari HP.
Tes komponen: validasi form, batas 4 foto, centang anonim tidak muncul untuk tamu, halaman sukses menampilkan kode.

KRITERIA SELESAI
Sesuai Definition of Done di AGENTS.md.
