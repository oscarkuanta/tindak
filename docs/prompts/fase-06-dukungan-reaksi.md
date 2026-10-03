Jalankan FASE 6: DUKUNGAN, REAKSI, PRIORITAS, BERANDA sesuai Protokol Fase di AGENTS.md. Bagian yang saya kerjakan: [ISI: A atau B]. Branch: feat/f6[a/b]-engagement. Baca docs/PRODUCT.md bagian "Dukungan dan Reaksi", "Skor Prioritas", "Urutan feed", dan "Beranda".

BAGIAN A (BACKEND)
Database:
- Support: id, reportId, userId, createdAt. Unique (reportId, userId).
- Reaction: id, reportId, userId, type (DANGEROUS, LONG_STANDING, ANNOYING), createdAt, updatedAt. Unique (reportId, userId).
- Kolom cache di Report: supportCount, dangerousCount, longStandingCount, annoyingCount, lastEngagementAt.
Aturan:
- Hanya user login. Pelapor tidak bisa mendukung laporannya sendiri (pelapor otomatis dihitung 1 di supportCount saat laporan dibuat).
- Terkunci saat RESOLVED, REJECTED, DUPLICATE (409 REPORT_LOCKED).
- Penindak Board itu boleh mendukung dan bereaksi.
Endpoint:
- PUT /api/reports/:id/support, DELETE /api/reports/:id/support
- PUT /api/reports/:id/reaction { type } (buat atau ganti), DELETE /api/reports/:id/reaction
- Respons berisi jumlah terbaru dan status milik user (mySupport, myReaction).
- Feed dan detail menambahkan mySupport dan myReaction untuk user login.
Skor (modul murni, wajib unit test dengan contoh di PRODUCT.md: hasil 53 dan 34):
- priorityScore = supportCount + dangerousCount*3 + longStandingCount*2 + annoyingCount + bobot severity (LOW 0, MEDIUM 10, DANGEROUS 30) + hari belum selesai*2
- Hitung ulang saat ada dukungan atau reaksi, saat status berubah, dan lewat job harian untuk faktor hari.
- hot = jumlah dukungan + reaksi dalam 48 jam terakhir. Pilih implementasi yang efisien (query agregasi dengan index createdAt, atau kolom cache yang diperbarui job tiap 15 menit). Jelaskan pilihan di laporan.
Feed:
- sort: hot, priority, new, resolved di GET /api/boards/:slug/reports dan queue.
- GET /api/feed/home?tab=following|hot&page= : following = laporan dari Board yang diikuti (requireAuth), hot = semua Board. Sertakan info Board di setiap item.
- GET /api/boards/popular: Board dengan pengikut dan aktivitas terbanyak.
Tes: unik per user, pelapor ditolak, terkunci, ganti reaksi, hitungan cache konsisten, rumus skor, urutan feed.

TAMBAHAN BAGIAN A: setiap item di GET /api/feed/home dan GET /api/boards/popular menyertakan board.verification.

BAGIAN B (FRONTEND)
- Tombol ⬆️ Dukung dengan jumlah dan status aktif. Optimistic update dengan rollback saat gagal.
- Tombol 😊 Reaksi: popover 3 emoji (🚨 Berbahaya, ⏳ Sudah Lama, 😤 Mengganggu) dengan label di bawah emoji dan tooltip penjelasan. Klik emoji sama untuk batal, emoji lain untuk ganti. Tombol berubah menampilkan emoji terpilih. Jumlah per emoji tampil di kartu: 🚨 12 · ⏳ 5 · 😤 8.
- Tamu klik Dukung atau Reaksi: LoginModal dengan judul "Masuk untuk mendukung laporan ini", setelah login kembali ke laporan yang sama dan aksi otomatis dijalankan sekali (simpan aksi tertunda di sessionStorage).
- Tab urutan di halaman Board berfungsi (Ramai default untuk user, Prioritas default untuk Penindak).
- Beranda: tamu dan user tanpa Board diikuti melihat laporan Ramai + Board populer. User dengan Board diikuti melihat tab Diikuti dan Ramai.
- Tombol terkunci tampil nonaktif dengan tooltip alasan.
Tes komponen: optimistic update, popover reaksi, aksi tertunda setelah login.
TAMBAHAN BAGIAN B: info Board di kartu laporan beranda dan daftar Board populer menampilkan OfficialBadge atau CommunityBadge versi kecil.
KRITERIA SELESAI
Sesuai Definition of Done di AGENTS.md.
