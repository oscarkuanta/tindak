Jalankan FASE 2B: BOARD FRONTEND sesuai Protokol Fase di AGENTS.md. Branch: feat/f2b-board-ui dari dev terbaru. Jangan mengubah folder server.

BACA DULU
- docs/PRODUCT.md bagian Board, Verifikasi Official, dan Layout Desktop
- docs/API.md bagian Fase 2
- Laporan Fase 1B (ikuti gaya desain minimalis dan komponen UI yang sudah dibuat di sana, jangan membuat gaya baru)
- Laporan Fase 2A (daftar akun seed untuk uji manual)

PRINSIP DESAIN
Lanjutkan design system dari Fase 1B: minimalis tapi tidak polos, rapi, mudah diganti saat desain UI/UX final tersedia. Semua warna dan font lewat design token. Komponen dibuat kecil dan terpisah.

KOMPONEN BADGE (WAJIB DIBEDAKAN)
- OfficialBadge: ikon centang di dalam lingkaran berwarna biru solid + teks "Official". Ini status yang diberikan manual oleh Admin Board.
- CommunityBadge: tampilan netral (abu-abu, outline) + teks "Komunitas".
- Siapkan slot untuk TrustBadge (label otomatis dari skor, dibuat di Fase 8). Bentuk TrustBadge nanti harus jelas beda dari OfficialBadge, jadi OfficialBadge memakai warna dan bentuk yang khas. Tulis catatan ini di laporan untuk desainer.
- ScopeBadge untuk jenis Board.

HALAMAN
1. /buat-board (RequireAuth), form 3 langkah dengan indikator langkah:
   - Langkah 1 "Identitas": nama Board, kota (dropdown dengan pencarian dari /api/meta/cities), jenis (kartu pilihan dengan ikon untuk 7 scopeType).
     Saat nama dan kota terisi, panggil /api/boards/similar (debounce 400ms). Jika ada hasil, tampilkan kotak "Board serupa sudah ada" berisi daftar Board dengan badge Official/Komunitas dan link. User tetap boleh lanjut.
   - Langkah 2 "Tentang Board": jabatan pengelola (opsional, keterangan "Hanya informasi, contoh: Ketua RT 05"), deskripsi dan cakupan (textarea dengan penghitung karakter).
     Tampilkan kotak informasi: "Board baru berstatus Komunitas. Status Official ✔️ diberikan Admin Board setelah Board mendapat banyak rating dan dipercaya pengguna."
     TIDAK ADA pilihan status pengelola atau Resmi/Relawan.
   - Langkah 3 "Pengaturan": kategori bawaan sesuai jenis (chip dari shared), tambah kategori, target jam laporan Berbahaya (default 48).
   - Ringkasan sebelum tombol "Buat Board".
   - Sukses: arahkan ke /b/:slug dengan toast "Board berhasil dibuat".
   - BOARD_LIMIT_REACHED: pesan + link ke "Board Saya".
   - Data form tidak hilang saat pindah langkah.
2. /b/:slug (publik), layout 3 kolom:
   - Header: sampul (jika kosong, blok warna dengan inisial), nama, OfficialBadge atau CommunityBadge di samping nama, kota, ScopeBadge, jabatan pengelola jika ada.
   - Tengah: tab urutan Ramai, Prioritas, Terbaru, Selesai (tampilan saja), tombol "Laporkan Masalah" (toast "Segera hadir"), status kosong "Belum ada laporan di Board ini".
   - Kanan: kotak "Status Verifikasi" (Official: "Diverifikasi Admin Board sejak <tanggal>". Komunitas: penjelasan singkat cara menjadi Official), deskripsi, statistik placeholder ("Belum ada data"), pemilik, jumlah Penindak, kategori, tombol "Ikuti" (tamu buka LoginModal, user toast "Segera hadir").
   - Jika myRole OWNER: tombol "Pengaturan Board".
   - 404: halaman "Board tidak ditemukan" dengan tombol cari Board.
3. /cari?q=&city=&scopeType=&verification= (publik)
   - Filter samping: kota, jenis, verifikasi (Semua, Official, Komunitas). Filter tersimpan di URL.
   - Kartu Board: nama + badge verifikasi, kota, jenis, pengikut, laporan aktif.
   - Pagination, skeleton loading, status kosong dengan tombol "Buat Board baru" (tamu lewat LoginModal).
4. /board-saya (RequireAuth): daftar Board dengan label peran (Penindak Utama atau Penindak) dan badge verifikasi, tombol ke Board dan Pengaturan untuk OWNER, teks "x dari 3 Board dibuat", tombol Buat Board nonaktif jika sudah 3.
5. /b/:slug/pengaturan (hanya OWNER, selain itu halaman 403)
   - "Informasi": ubah nama, jabatan, deskripsi, target jam Berbahaya. Kota, jenis, dan status verifikasi tampil tapi tidak bisa diubah, beri keterangan.
   - "Verifikasi": status saat ini dan penjelasan bahwa Official diberikan Admin Board berdasarkan rating. Tidak ada tombol pengajuan.
   - "Kategori": tambah, ubah nama inline, hapus dengan konfirmasi, ubah urutan dengan tombol naik dan turun.
   - "Penindak": placeholder "Segera hadir di Fase 3".

KOMPONEN GLOBAL
- Pencarian header: debounce 300ms, dropdown maks 5 saran (nama, badge verifikasi, kota), item terakhir "Lihat semua hasil untuk ...". Navigasi keyboard (panah, Enter, Escape).
- Header: tombol "+ Buat Board" untuk user login (tamu lewat LoginModal).
- Dropdown avatar: tambah link "Verifikasi Board" untuk role BOARD_ADMIN dan "Panel Admin" untuk role ADMIN. Keduanya menuju halaman placeholder "Segera hadir".
- Sidebar kiri: Beranda, Board Saya (jika login), placeholder Board diikuti.
- Komponen BoardCard, CitySelect, EmptyState, Skeleton, Toast.

DATA
- features/boards/api.js dan hooks.js memakai TanStack Query. Query key: ["boards","search",params], ["boards",slug], ["me","boards"].
- Invalidate query setelah membuat atau mengubah Board.
- Form memakai skema Zod dari shared. Label enum dari konstanta shared.

TES
- Langkah form Buat Board (validasi per langkah, data tetap saat kembali), tidak ada pilihan status pengelola di form, peringatan Board serupa muncul, OfficialBadge dan CommunityBadge tampil sesuai data, halaman pengaturan menolak bukan OWNER, link Verifikasi Board hanya untuk BOARD_ADMIN.
- Checklist uji manual di laporan memakai akun seed Fase 2A.

KRITERIA SELESAI
- Alur buat, cari, buka, dan atur Board berjalan di browser dengan backend 2A dan data seed.
- npm run lint, npm test, npm run build lolos.
- Laporan berisi daftar halaman yang sudah jadi untuk dicocokkan desainer.
