# Laporan Fase 1B: Auth Frontend

- Branch: `feat/f1b-auth-ui` (dibuat dari `fix/f1a-auth-lengkap`)
- Pemilik: Oscar
- Tanggal: 2026-10-03
- PR: ke `dev`, setelah PR revisi 1A di-merge

## Ringkasan

Halaman Masuk dan Daftar sudah berjalan dengan backend 1A di browser: daftar, masuk, keluar, tombol Google, dan returnTo. Header menampilkan tombol Masuk/Daftar untuk tamu dan avatar dengan menu untuk user. Halaman yang wajib login dilindungi `RequireAuth`. Ada juga `useLoginPrompt()` untuk membuka modal "Masuk untuk ..." yang akan dipakai fase berikutnya. Desainnya minimalis, dan semua warna diatur lewat design token.

## Yang Dikerjakan

- Halaman `/masuk`: email, password, tombol Google, link ke Daftar. Membaca `?returnTo=` dan `?error=google` / `?error=google_unavailable`. Error `USE_GOOGLE_LOGIN` menampilkan pesan dari server dan menonjolkan tombol Google.
- Halaman `/daftar`: nama, email, password, konfirmasi password, tombol Google, dan checklist syarat password yang berubah menjadi centang saat terpenuhi.
- Setelah masuk atau daftar, user diarahkan ke `returnTo` jika path-nya aman, selain itu ke `/`. User yang sudah login dan membuka `/masuk` atau `/daftar` langsung diarahkan.
- `features/auth`: `api.js`, `hooks.js` (`useMe`, `useLogin`, `useRegister`, `useLogout`), `RequireAuth`, `GuestOnly`, `LoginPromptProvider` + `useLoginPrompt()`, `GoogleButton`, `PasswordChecklist`, `returnTo.js`, `formErrors.js`.
- Header: tombol Masuk dan Daftar untuk tamu. Avatar (foto atau inisial) dengan menu berisi nama, email, Profil, Board Saya, dan Keluar. Menu bisa ditutup dengan klik di luar atau tombol Escape.
- Halaman placeholder `/profil` dan `/board-saya` (wajib login).
- Komponen UI baru dan diperbarui: `ButtonLink`, prop `loading` pada `Button` (teks "Memproses..." dan tidak bisa diklik), `Alert`, `Avatar`, `Spinner`, `Modal` (Escape, fokus terkunci, latar buram), dan `Input` yang menggabungkan `aria-describedby`.
- Token desain baru: `--color-brand-soft`, `--color-accent`, `--color-accent-soft`, `--radius-card`, `--shadow-card`.
- Tes client: Vitest + React Testing Library + jsdom.

## File Penting

| File                                               | Keterangan                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `client/src/features/auth/hooks.js`                | Query `["me"]` dan mutation auth                                                        |
| `client/src/features/auth/RequireAuth.jsx`         | Pembungkus route wajib login                                                            |
| `client/src/features/auth/GuestOnly.jsx`           | Pembungkus `/masuk` dan `/daftar`, sekaligus mengarahkan ke `returnTo` setelah berhasil |
| `client/src/features/auth/LoginPromptProvider.jsx` | Modal login yang dibuka lewat `useLoginPrompt()`                                        |
| `client/src/features/auth/returnTo.js`             | `safeReturnTo`, `loginPath`, `googleLoginUrl`                                           |
| `client/src/pages/login/LoginPage.jsx`             | Halaman Masuk                                                                           |
| `client/src/pages/register/RegisterPage.jsx`       | Halaman Daftar                                                                          |
| `client/src/app/layouts/AuthLayout.jsx`            | Kartu di tengah layar untuk halaman auth                                                |
| `client/src/app/layouts/UserMenu.jsx`              | Avatar dan dropdown akun                                                                |
| `client/src/app/router.jsx`                        | Daftar route (`routes`) dan `createAppRouter()`                                         |
| `client/src/index.css`                             | Design token                                                                            |
| `client/src/test/renderApp.jsx`                    | Helper tes: render aplikasi dan mock `fetch`                                            |

## Perubahan Database

Tidak ada.

## Endpoint Baru

Tidak ada. Frontend memakai 6 endpoint auth dari Fase 1A sesuai `docs/API.md`.

## Cara Menguji Manual

Jalankan `npm run dev`, lalu buka `http://localhost:5173`.

- [x] **Halaman terlindungi**: buka `/profil` saat belum login. Kamu diarahkan ke `/masuk?returnTo=%2Fprofil`.
- [x] **Daftar**: klik "Daftar", isi form. Checklist password berubah hijau satu per satu. Konfirmasi yang berbeda menampilkan "Konfirmasi password tidak sama". Setelah berhasil, kamu diarahkan ke `/profil`.
- [x] **Menu akun**: klik avatar. Nama dan email tampil. Tekan Escape atau klik di luar untuk menutup.
- [x] **Keluar**: klik "Keluar". Header kembali menampilkan Masuk dan Daftar.
- [x] **Masuk**: masuk dengan akun tadi. Kamu diarahkan ke Beranda.
- [ ] **Password salah**: muncul "Email atau password salah".
- [ ] **Sudah login membuka `/masuk`**: langsung diarahkan ke Beranda.
- [x] **Masuk Google tanpa konfigurasi**: klik "Masuk dengan Google". Kamu kembali ke `/masuk` dengan pesan "Login Google belum tersedia saat ini".
- [ ] **Masuk Google sungguhan**: isi env Google (README), klik tombol Google dari `/masuk?returnTo=%2Fprofil`. Setelah memilih akun, kamu kembali ke `/profil`.
- [ ] **Akun yang hanya pakai Google lalu masuk dengan password**: muncul pesan "Akun ini terdaftar lewat Google..." dan tombol Google diberi garis biru.
- [ ] **Tampilan HP**: perkecil browser. Kartu masuk tetap rapi, dan kolom kiri serta kanan di Beranda tersembunyi.

Yang dicentang sudah dicoba langsung di browser (Chrome) dengan backend 1A. Sisanya dicakup tes otomatis atau butuh credential Google asli.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: server 79 tes lolos, client 17 tes lolos.
  - `LoginPage.test.jsx`: validasi form kosong (tanpa memanggil server, error terhubung ke input lewat `aria-describedby`), error dari server, error per field dari server, `USE_GOOGLE_LOGIN` menonjolkan tombol Google, pesan `?error=google`, redirect ke `returnTo` aman, `returnTo` ke situs lain diabaikan, dan user yang sudah login dialihkan.
  - `RequireAuth.test.jsx`: tamu dialihkan ke `/masuk` dengan `returnTo`, user yang login melihat halaman, dan tabel `safeReturnTo`.
- `npm run build`: lolos.

## Keputusan dan Alasan

- **Redirect setelah login ditangani `GuestOnly`.** Begitu data `["me"]` berisi user, `GuestOnly` mengarahkan ke `returnTo`. Dengan begitu tidak ada balapan antara `navigate()` di form dan redirect otomatis, dan aturan "sudah login membuka /masuk" otomatis terpenuhi.
- **`returnTo` ke `/masuk` atau `/daftar` diganti `/`**, supaya tidak terjadi putaran redirect.
- **Modal memakai elemen `<dialog>` bawaan browser.** `showModal()` sudah mengunci fokus di dalam modal dan menutup modal dengan Escape, tanpa library tambahan.
- **Konfirmasi password hanya dicek di frontend**, karena tidak dikirim ke server. Skema form memperluas `registerSchema` dari `shared`.
- **Warna ikon Google memakai hex asli logo Google.** Ini warna merek pihak lain, bukan bagian tema T!indak.
- **Script `npm test` di root sekarang menjalankan tes server lalu client.** Nama langkah di CI diganti menjadi "Test server dan client".

## Panduan untuk Desainer UI/UX

- Ganti warna dan bentuk di `client/src/index.css` (blok `@theme static`): `--color-brand` (oranye utama), `--color-accent` (biru untuk avatar, info, dan tombol Google yang disorot), `--radius-card`, `--shadow-card`, serta font.
- Tampilan semua tombol diatur di satu file: `client/src/components/ui/buttonStyles.js`.
- Halaman auth: `AuthLayout.jsx` (latar dan kartu), `LoginPage.jsx`, `RegisterPage.jsx`. Logika form terpisah di `features/auth`, jadi tampilan bisa diganti tanpa menyentuh logika.

## Hal yang Belum Selesai

- Login Google dengan credential asli belum dicoba.
- Halaman Profil dan Board Saya masih placeholder.
- `useLoginPrompt()` belum dipakai di mana pun. Baru akan dipakai saat tombol Dukung dan Ikuti dibuat.
- Ada 2 user uji di database development milik Oscar (`manual...@example.com` dan `browser.uji@example.com`). Boleh dihapus.

## Catatan untuk Fase Berikutnya

- Untuk aksi yang wajib login: `const { openLoginPrompt } = useLoginPrompt();` lalu `openLoginPrompt({ title: 'Masuk untuk mendukung laporan ini' })`. Setelah login, user kembali ke halaman yang sama.
- Untuk cek login di komponen: `const { data: user } = useMe();`. Nilai `null` berarti tamu, `undefined` berarti masih memuat.
- Halaman baru yang wajib login cukup ditaruh di dalam route `RequireAuth` di `router.jsx`.
- Untuk tes halaman baru, pakai `renderApp(path)` dan `mockApi({...})` dari `client/src/test/renderApp.jsx`.
