# Panduan Kontribusi T!indak

Tim terdiri dari 3 orang. Setiap orang boleh memakai AI, tetapi AI wajib mengikuti [AGENTS.md](AGENTS.md). Dokumen ini adalah versi singkat untuk manusia.

## Setup Lokal

Ikuti langkah di [README.md](README.md#setup-lokal-langkah-demi-langkah). Ringkasnya:

```bash
npm install
cp .env.example .env
cp .env.test.example .env.test
npm run db:migrate
npm run dev
```

## Alur Git

```
main  <- rilis, hanya menerima merge dari dev
dev   <- integrasi, semua PR fitur masuk ke sini
feat/f1a-auth-api, feat/f1b-auth-ui, ...  <- branch kerja
```

1. Ambil `dev` terbaru:

   ```bash
   git checkout dev
   git pull origin dev
   ```

2. Buat branch baru sesuai fase dan bagian:

   ```bash
   git checkout -b feat/f1b-auth-ui
   ```

   Format: `feat/f<nomor><bagian>-nama-singkat`. Bagian `a` untuk backend, `b` untuk frontend.

3. Kerjakan, lalu commit dengan format Conventional Commits:

   ```bash
   git add .
   git commit -m "feat(auth): tambah halaman login"
   ```

   Awalan yang dipakai: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.

4. Sebelum push, pastikan lolos:

   ```bash
   npm run lint
   npm test
   ```

5. Push dan buat Pull Request ke `dev`:

   ```bash
   git push -u origin feat/f1b-auth-ui
   ```

   Buka GitHub, klik **Compare & pull request**, pastikan base branch adalah `dev`, lalu isi template PR.

6. Tunggu CI hijau, lalu merge. Approval tidak wajib, pembuat PR boleh merge sendiri.

Jangan push langsung ke `main` atau `dev`.

## Pembagian Wilayah File

| Bagian       | Boleh mengubah                | Tidak boleh mengubah    |
| ------------ | ----------------------------- | ----------------------- |
| A (backend)  | `server/`, `shared/`, `docs/` | `client/`               |
| B (frontend) | `client/`, `shared/`, `docs/` | `server/`, skema Prisma |

Jika frontend butuh perubahan di server, tulis di laporan fase atau minta anggota backend.

## Untuk Desainer UI/UX

- Semua warna, font, radius, lebar layout, dan tinggi header ada di satu tempat: `client/src/index.css` di blok `@theme static`.
- Mengganti tema cukup dengan mengubah nilai di blok itu. Contoh mengganti warna utama: ubah `--color-brand`.
- Nama token otomatis menjadi class Tailwind. `--color-brand` menjadi `bg-brand`, `text-brand`, `border-brand`. `--color-text-muted` menjadi `text-text-muted`.
- Di komponen, jangan menulis warna langsung seperti `#ff0000` atau `bg-red-500`. Jika butuh warna baru, tambahkan token baru di `index.css`.
- Komponen dasar ada di `client/src/components/ui/` (Button, Input, Modal, Card, Badge). Ubah tampilan di sana agar semua halaman ikut berubah.
- Layout 3 kolom ada di `client/src/app/layouts/`: `Header.jsx`, `LeftNav.jsx`, `RightSidebar.jsx`, `AppLayout.jsx`.

## Cara Review PR

Saat menjadi reviewer:

1. Baca deskripsi PR dan laporan fase di `docs/reports/`.
2. Pastikan CI hijau.
3. Checkout branch dan coba sendiri:

   ```bash
   git fetch origin
   git checkout feat/f1b-auth-ui
   npm install
   npm run db:migrate
   npm run dev
   ```

4. Ikuti bagian "Cara Menguji Manual" di laporan fase.
5. Periksa:
   - Scope sesuai fase, tidak mengerjakan fitur fase lain.
   - Endpoint dan respons sesuai `docs/API.md`.
   - Ada tes untuk endpoint baru.
   - Tidak ada secret, `.env`, atau `console.log`.
   - Teks yang dilihat pengguna memakai bahasa Indonesia.
6. Beri komentar di baris kode yang perlu diperbaiki. Review bersifat opsional dan tidak menghalangi merge.

## Jika Migrasi Bentrok

Jika setelah `git pull` ada migrasi baru dari orang lain dan migrasi kamu belum di-merge:

1. Hapus folder migrasi milikmu di `server/prisma/migrations/`.
2. `git pull origin dev`.
3. `npm run db:migrate` untuk membuat ulang migrasimu.

Jangan pernah mengedit migrasi yang sudah di-merge ke `dev`.
