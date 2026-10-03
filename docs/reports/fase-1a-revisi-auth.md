# Laporan Fase 1A (Revisi): Menyamakan Auth dengan Prompt Asli

- Branch: `fix/f1a-auth-lengkap`
- Pemilik: Oscar
- Tanggal: 2026-10-03
- PR: ke `dev`

## Ringkasan

Fase 1A pertama dikerjakan dari prompt yang tidak lengkap. Revisi ini menyamakan backend auth dengan prompt 1A yang asli, supaya Fase 1B (frontend) bisa memakai kontrak yang benar. Laporan pertama tetap ada di `fase-1a-auth-backend.md`. Laporan ini hanya mencatat perubahannya.

## Yang Dikerjakan

| Bagian                                | Sebelum                                                   | Sesudah                                                                                             |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Login akun yang hanya pakai Google    | `401 INVALID_CREDENTIALS`                                 | `401 USE_GOOGLE_LOGIN` dengan pesan "Akun ini terdaftar lewat Google. Silakan masuk dengan Google." |
| `POST /logout`                        | `200 { loggedOut: true }`                                 | `204` tanpa body                                                                                    |
| `GET /me` untuk tamu                  | `200 { data: null }`                                      | `401 UNAUTHENTICATED`                                                                               |
| Query login Google                    | `?redirect=`                                              | `?returnTo=`                                                                                        |
| Redirect saat Google gagal            | `/login?error=google_failed`                              | `/masuk?error=google`                                                                               |
| Google belum dikonfigurasi            | `/login?error=google_unavailable`                         | `/masuk?error=google_unavailable`                                                                   |
| Menautkan Google ke akun email        | Password tetap ada                                        | Password dicabut dan semua session lama akun itu dihapus                                            |
| Profil Google tanpa status verifikasi | Diterima jika tidak `false`                               | Ditolak jika tidak `true`                                                                           |
| Rate limit daftar                     | 10 per 15 menit                                           | 5 per jam per IP                                                                                    |
| Middleware                            | `requireAuth.js`                                          | `middlewares/auth.js`: `attachUser`, `requireAuth`, `requireAdmin`, `optionalAuth`                  |
| CSRF                                  | Hanya cookie sameSite lax                                 | Ditambah cek header `Origin` untuk POST, PUT, PATCH, DELETE (`403 CSRF_REJECTED`)                   |
| Admin                                 | Hanya `ADMIN_EMAILS`, dan role bisa turun lagi saat login | Ditambah `npm run make-admin -- email`. Role ADMIN tidak pernah diturunkan otomatis                 |
| User publik                           | Ada `hasGoogle`                                           | `hasGoogle` dihapus. `googleId` tidak pernah dikirim                                                |

## File Penting

| File                                         | Keterangan                                                      |
| -------------------------------------------- | --------------------------------------------------------------- |
| `server/src/middlewares/auth.js`             | `attachUser`, `requireAuth`, `requireAdmin`, `optionalAuth`     |
| `server/src/middlewares/verifyOrigin.js`     | Cek header Origin (CSRF)                                        |
| `server/src/modules/auth/auth.service.js`    | `USE_GOOGLE_LOGIN`, penautan Google yang aman, `promoteToAdmin` |
| `server/src/modules/auth/auth.controller.js` | 204 logout, 401 me, `returnTo`, redirect `/masuk`               |
| `server/src/lib/PrismaSessionStore.js`       | Menyimpan `userId` di setiap session                            |
| `server/scripts/make-admin.js`               | Script menjadikan user ADMIN                                    |

## Perubahan Database

Migrasi `20261003104607_add_session_user_id`: kolom `sessions.user_id` (boleh null, index, foreign key ke `users.id` dengan `ON DELETE CASCADE`). Kolom ini diperlukan supaya semua session milik satu user bisa dihapus saat akunnya ditautkan ke Google. Session ikut terhapus jika user dihapus.

## Endpoint Baru

Tidak ada endpoint baru. Kontrak 6 endpoint auth di `docs/API.md` bagian Fase 1 ditulis ulang sesuai tabel di atas.

## Cara Menguji Manual

Jalankan `npm run db:migrate`, lalu `npm run dev`. Contoh dengan curl (simpan cookie di `jar.txt`):

```bash
curl -i http://localhost:5173/api/auth/me
curl -i -c jar.txt -b jar.txt -H "Content-Type: application/json" -d '{"name":"Uji","email":"uji@example.com","password":"rahasia123"}' http://localhost:5173/api/auth/register
curl -i -c jar.txt -b jar.txt http://localhost:5173/api/auth/me
curl -i -c jar.txt -b jar.txt -X POST http://localhost:5173/api/auth/logout
curl -i -H "Content-Type: application/json" -d '{"email":"uji@example.com","password":"salah1234"}' http://localhost:5173/api/auth/login
curl -i -c jar.txt -b jar.txt -H "Content-Type: application/json" -d '{"email":"uji@example.com","password":"rahasia123"}' http://localhost:5173/api/auth/login
curl -i -H "Origin: https://evil.com" -H "Content-Type: application/json" -d '{}' http://localhost:5173/api/auth/login
npm run make-admin -- uji@example.com
```

Hasil yang diharapkan, berurutan: 401, 201 dengan cookie, 200, 204, 401 `INVALID_CREDENTIALS`, 200, 403 `CSRF_REJECTED`, lalu tulisan "Berhasil: uji@example.com sekarang ADMIN".

Di Thunder Client atau Postman, buat request yang sama. Cookie disimpan otomatis.

Login Google: isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` (lihat README), lalu buka `http://localhost:5173/api/auth/google?returnTo=/` di browser.

## Hasil Tes

- `npm run lint`: lolos.
- `npm test`: 5 file tes, 79 tes lolos. Tes baru mencakup `USE_GOOGLE_LOGIN`, logout 204, `me` 401, cek Origin, rate limit daftar 5 per jam, penautan Google yang mencabut password dan menghapus session lama, login ulang Google, profil tanpa status verifikasi, `requireAdmin`, `promoteToAdmin`, dan `userId` di session store.

## Keputusan dan Alasan

- **Penautan Google mencabut password.** Tidak ada verifikasi email saat daftar, jadi penyerang bisa mendaftar lebih dulu memakai email korban. Saat pemilik asli masuk lewat Google, password buatan penyerang dicabut dan semua session penyerang dihapus. Prompt meminta alasan ini juga ditulis sebagai komentar di kode, tetapi tim memutuskan kode tanpa komentar, jadi alasannya ditulis di laporan ini dan di `docs/API.md`.
- **`USE_GOOGLE_LOGIN` membocorkan sedikit informasi**, yaitu bahwa email itu terdaftar lewat Google. Ini keputusan produk dari prompt, demi pengalaman pengguna yang lebih jelas.
- **Cek Origin menerima request tanpa header `Origin`.** Browser selalu mengirim `Origin` pada request POST, PUT, PATCH, dan DELETE, jadi serangan CSRF lewat browser tetap tertolak. Alat seperti curl dan Thunder Client tetap bisa dipakai untuk mencoba API.
- **Rate limit login hanya menghitung percobaan gagal**, supaya user yang berhasil masuk berkali-kali tidak ikut terblokir.
- **Kolom `onboardedAt` dan `lastLoginAt` tetap dipertahankan** walau tidak ada di prompt. `onboardedAt` dibutuhkan untuk Halaman Sambutan di PRODUCT.md.

## Hal yang Belum Selesai

- Login Google belum dicoba dengan credential asli. Kriteria selesai prompt 1A meminta ini, dan perlu dilakukan Oscar setelah membuat OAuth client (langkah di README).

## Catatan untuk Fase Berikutnya

- Endpoint yang boleh diakses tamu tetapi perlu tahu siapa yang login: pakai `optionalAuth`, lalu cek `req.user` (bernilai `null` untuk tamu).
- Endpoint khusus Admin: `requireAdmin`.
- Request dari frontend tidak perlu header tambahan untuk cek Origin, karena browser mengirimnya otomatis.
