# Kontrak API T!indak

Dokumen ini adalah kontrak antara backend (bagian A) dan frontend (bagian B). Jika kode dan dokumen berbeda, dokumen ini yang benar sampai diubah lewat PR. Setiap perubahan kontrak wajib ditulis di laporan fase.

## Konvensi Umum

- Base URL: `/api`. Di development, client memanggil `http://localhost:5173/api/...` dan Vite meneruskannya ke `http://localhost:3000`.
- Semua body request dan respons memakai JSON (`Content-Type: application/json`), kecuali disebutkan lain. Batas body 1 MB.
- Autentikasi memakai cookie session (httpOnly). Client wajib mengirim `credentials: "include"` (sudah diatur di `client/src/lib/api.js`).
- Nama field memakai camelCase. Tanggal memakai format ISO 8601 UTC, contoh `2026-10-03T08:14:00.000Z`.
- Enum ditulis dalam HURUF_BESAR bahasa Inggris. Label bahasa Indonesia ada di `shared`.

### Format Respons Sukses

```json
{ "data": { "id": 1 } }
```

Untuk daftar dengan pagination:

```json
{
  "data": [{ "id": 1 }],
  "meta": { "page": 1, "pageSize": 20, "total": 57, "totalPages": 3 }
}
```

Parameter pagination standar: `page` (default 1, min 1) dan `pageSize` (default 20, min 1, maks 50).

### Format Respons Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid",
    "details": [{ "field": "email", "message": "Format email tidak valid" }]
  }
}
```

- `code` stabil dan dipakai frontend untuk logika. `message` bahasa Indonesia dan boleh ditampilkan ke pengguna.
- `details` selalu array. Untuk error validasi berisi `{ field, message }`, dengan `field` berupa path seperti `categories.0`.

### Kode Error Umum

| Status | Code                  | Arti                                                       |
| ------ | --------------------- | ---------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak lolos skema Zod                                |
| 400    | `INVALID_JSON`        | Body bukan JSON yang valid                                 |
| 401    | `UNAUTHENTICATED`     | Wajib login                                                |
| 403    | `FORBIDDEN`           | Sudah login tapi tidak punya hak akses                     |
| 403    | `CSRF_REJECTED`       | Request dari situs lain (header Origin bukan `CLIENT_URL`) |
| 404    | `NOT_FOUND`           | Endpoint atau data tidak ditemukan                         |
| 409    | `CONFLICT`            | Data bentrok (misalnya nilai unik sudah ada)               |
| 413    | `PAYLOAD_TOO_LARGE`   | Body melebihi 1 MB                                         |
| 429    | `RATE_LIMITED`        | Terlalu banyak permintaan                                  |
| 503    | `SERVICE_UNAVAILABLE` | Database atau layanan pendukung tidak tersedia             |
| 500    | `INTERNAL_ERROR`      | Error tak terduga, detail tidak dibocorkan                 |

Kode error khusus fitur tercantum di setiap endpoint. Semua endpoint di bawah `/api` juga terkena rate limit umum 300 permintaan per menit per IP.

### Keterangan Auth

- **Publik**: boleh tanpa login.
- **Login**: wajib login, jika tidak `401 UNAUTHENTICATED`.
- **OWNER**: wajib login dan menjadi Penindak Utama board tersebut, jika tidak `403 FORBIDDEN`.

---

## Fase 0: Sistem

### GET /api/health

Auth: Publik. Mengecek server dan koneksi database.

Sukses `200`:

```json
{ "data": { "status": "ok", "db": "ok" } }
```

Error: `503 SERVICE_UNAVAILABLE` jika database tidak dapat dihubungi.

---

## Fase 1: Auth

### Objek User (publik)

```json
{
  "id": 12,
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "avatarUrl": null,
  "role": "USER",
  "hasPassword": true,
  "needsOnboarding": true,
  "createdAt": "2026-10-03T08:14:00.000Z"
}
```

- `role`: role tingkat website. `USER`, `ADMIN` (moderator), atau `BOARD_ADMIN` (pemberi status Official, baru aktif di Fase 8).
- `ADMIN` diberikan otomatis jika email ada di env `ADMIN_EMAILS` (saat daftar atau login), atau lewat `npm run make-admin -- email@contoh.com`. Role `ADMIN` tidak pernah diturunkan otomatis.
- `hasPassword`: `false` untuk akun yang hanya bisa masuk lewat Google.
- `needsOnboarding`: `true` sampai user melewati Halaman Sambutan (endpoint penyelesaiannya dibuat di fase berikutnya).
- `passwordHash` dan `googleId` tidak pernah dikirim.

### Catatan Ban

Pengecekan ban akun (`403 ACCOUNT_BANNED`) ditunda ke Fase 7 Moderasi, bersama tabel ban akun, perangkat, dan IP.

### Aturan Session dan Keamanan

- Nama cookie `tindak.sid`, httpOnly, `sameSite=lax`, `secure` di production, umur 30 hari.
- Session disimpan di tabel `sessions` (MySQL). Session kedaluwarsa dibersihkan otomatis setiap 15 menit.
- Session ID diganti (regenerate) setiap login dan register untuk mencegah session fixation.
- Cookie hanya dibuat saat login, daftar, atau memulai login Google.
- **Cek Origin (CSRF)**: request `POST`, `PUT`, `PATCH`, `DELETE` yang membawa header `Origin` berbeda dari `CLIENT_URL` ditolak `403 CSRF_REJECTED`. Request tanpa header `Origin` (curl, Thunder Client) tetap diterima, karena browser selalu mengirim `Origin` untuk request seperti ini.

### POST /api/auth/register

Auth: Publik. Rate limit: 5 per jam per IP. Mendaftar dengan email dan password, lalu langsung login. Tidak ada verifikasi email (keputusan produk).

Body:

```json
{ "name": "Budi Santoso", "email": "budi@example.com", "password": "rahasia123" }
```

| Field      | Aturan                                                        |
| ---------- | ------------------------------------------------------------- |
| `name`     | wajib, string 2 sampai 50 karakter, di-trim                   |
| `email`    | wajib, format email, maks 191 karakter, disimpan huruf kecil  |
| `password` | wajib, 8 karakter sampai 72 byte, minimal 1 huruf dan 1 angka |

Sukses `201`: `{ "data": <User> }` dan cookie session dipasang.

Error:

| Status | Code               | Kapan                                                       |
| ------ | ------------------ | ----------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Input tidak valid, `details` per field                      |
| 403    | `CSRF_REJECTED`    | Origin bukan `CLIENT_URL`                                   |
| 409    | `EMAIL_TAKEN`      | Email sudah terdaftar (tanpa memedulikan huruf besar kecil) |
| 429    | `RATE_LIMITED`     | Terlalu banyak percobaan                                    |

### POST /api/auth/login

Auth: Publik. Rate limit: 10 percobaan **gagal** per 15 menit per kombinasi IP dan email. Login yang berhasil tidak dihitung.

Body:

```json
{ "email": "budi@example.com", "password": "rahasia123" }
```

Sukses `200`: `{ "data": <User> }` dan cookie session dipasang.

Error:

| Status | Code                  | Kapan                                                                                                      |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak valid                                                                                          |
| 401    | `INVALID_CREDENTIALS` | Email tidak terdaftar atau password salah. Pesan sama untuk kedua kasus: "Email atau password salah"       |
| 401    | `USE_GOOGLE_LOGIN`    | Akun hanya bisa masuk lewat Google. Pesan: "Akun ini terdaftar lewat Google. Silakan masuk dengan Google." |
| 403    | `CSRF_REJECTED`       | Origin bukan `CLIENT_URL`                                                                                  |
| 429    | `RATE_LIMITED`        | Terlalu banyak percobaan gagal                                                                             |

### POST /api/auth/logout

Auth: Login. Menghancurkan session dan menghapus cookie.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`.

### GET /api/auth/me

Auth: Publik (dengan `optionalAuth`). Dipakai frontend saat aplikasi dibuka.

- Sudah login: `200` `{ "data": <User> }`
- Belum login: `401 UNAUTHENTICATED`. Frontend menganggap 401 dari endpoint ini sebagai tamu, bukan error.

### GET /api/auth/google

Auth: Publik. Mengarahkan browser ke halaman login Google (`302`).

Query:

| Field      | Aturan                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `returnTo` | opsional, path relatif tujuan setelah login, contoh `/b/jalan-rungkut-madya-surabaya`. Harus diawali `/` dan tidak diawali `//`. Nilai lain diabaikan dan diganti `/` |

Endpoint ini dibuka lewat link atau navigasi browser, bukan fetch.

Jika login Google belum dikonfigurasi di server, langsung `302` ke `CLIENT_URL/masuk?error=google_unavailable`.

### GET /api/auth/google/callback

Auth: Publik. Dipanggil oleh Google, bukan oleh frontend.

- Berhasil: pasang session, lalu `302` ke `CLIENT_URL + returnTo` (default `/`).
- Gagal atau dibatalkan: `302` ke `CLIENT_URL/masuk?error=google`.
- Login Google belum dikonfigurasi: `302` ke `CLIENT_URL/masuk?error=google_unavailable`.

Aturan akun:

1. `googleId` sudah terdaftar: masuk sebagai user itu.
2. `googleId` belum ada tetapi email sudah dipakai akun email + password: `googleId` ditautkan ke akun itu, **password dicabut** (`hasPassword` menjadi `false`), dan **semua session lama akun itu dihapus**. Alasannya, tidak ada verifikasi email saat daftar, jadi orang lain bisa mendaftar lebih dulu memakai email korban. Google membuktikan siapa pemilik email yang asli, sehingga password buatan penyerang harus dicabut.
3. Keduanya belum ada: buat user baru dengan nama, email, dan foto dari Google.
4. Email Google yang tidak terverifikasi ditolak (masuk ke alur gagal).

---

## Fase 2: Board

### Enum Board

| Enum                | Nilai                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BoardType`         | `SCHOOL` (Sekolah), `CAMPUS` (Kampus), `OFFICE` (Kantor), `ROAD` (Jalan), `AREA` (Wilayah RT/RW/Kelurahan), `PUBLIC_FACILITY` (Fasilitas Umum), `OTHER` (Lainnya) |
| `BoardVerification` | `COMMUNITY` (Komunitas, status awal semua board), `OFFICIAL` (Official ✔️, diberikan Admin Board)                                                                 |
| `BoardRole`         | `OWNER` (Penindak Utama), `HANDLER` (Penindak)                                                                                                                    |
| `TrustLabel`        | `NEW` (🆕 Baru), `TRUSTED` (✅ Terpercaya), `NONE` (tanpa label), `CAUTION` (⚠️ Perlu Waspada), `INACTIVE` (💤 Tidak Aktif)                                       |

Kategori bawaan per jenis (disimpan di `shared`, otomatis dibuat saat board dibuat):

- `SCHOOL`, `CAMPUS`, `OFFICE`: Kebersihan, Kerusakan Fasilitas, Listrik, Air dan Sanitasi, Keamanan, Lainnya
- `ROAD`: Jalan Berlubang, Lampu Jalan, Drainase dan Banjir, Rambu dan Marka, Pohon Tumbang, Lainnya
- `AREA`, `PUBLIC_FACILITY`, `OTHER`: Sampah, Drainase, Penerangan, Fasilitas Rusak, Keamanan, Lainnya

### Objek BoardCard

Dipakai di hasil pencarian dan daftar.

```json
{
  "id": 3,
  "slug": "jalan-rungkut-madya-surabaya",
  "name": "Jalan Rungkut Madya",
  "city": "Surabaya",
  "type": "ROAD",
  "verification": "COMMUNITY",
  "coverImageUrl": null,
  "trustScore": 3.6,
  "trustLabel": "NEW",
  "followerCount": 0,
  "activeReportCount": 0
}
```

### Objek Board (detail)

Semua field BoardCard ditambah:

```json
{
  "managerTitle": "Ketua RT 05",
  "description": "Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.",
  "dangerousTargetHours": 48,
  "verifiedAt": null,
  "ratingCount": 0,
  "responseRate": 0,
  "rejectedPercentage": 0,
  "handlerCount": 1,
  "isInactive": false,
  "createdAt": "2026-10-03T08:14:00.000Z",
  "categories": [
    { "id": 10, "name": "Jalan Berlubang", "isDefault": true },
    { "id": 15, "name": "Lainnya", "isDefault": true }
  ],
  "viewer": { "isFollowing": false, "role": "OWNER" }
}
```

- `slug` dibuat dari nama dan kota, unik. Jika sudah dipakai, diberi akhiran `-2`, `-3`, dan seterusnya. Slug tidak berubah walaupun nama diganti.
- `trustScore` dan `trustLabel` dihitung dengan rumus di PRODUCT.md. Di Fase 2 nilainya dari board tanpa rating (`trustLabel` `NEW`). Field rating dan pengikut terisi penuh di Fase 3 dan 8.
- `viewer` bernilai `null` untuk tamu. `viewer.role` bernilai `OWNER`, `HANDLER`, atau `null`.
- `coverImageUrl` selalu `null` sampai infrastruktur upload dibuat di Fase 4.
- `verification` selalu `COMMUNITY` saat board dibuat. Pembuat board tidak bisa memilih `OFFICIAL`. `verifiedAt` berisi waktu board dijadikan Official, atau `null`.
- `managerTitle` adalah jabatan pengelola yang ditulis sendiri oleh Penindak Utama. Field ini hanya informasi, bukan bukti resmi.

### POST /api/boards

Auth: Login. Rate limit: 10 per jam per user. Membuat board baru. Pembuat otomatis menjadi `OWNER`.

Body:

```json
{
  "name": "Jalan Rungkut Madya",
  "city": "Surabaya",
  "type": "ROAD",
  "managerTitle": "Ketua RT 05",
  "description": "Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.",
  "extraCategories": ["Parkir Liar"],
  "dangerousTargetHours": 48
}
```

| Field                  | Aturan                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | wajib, 3 sampai 80 karakter, di-trim                                                                                                                  |
| `city`                 | wajib, harus ada di daftar `GET /api/meta/cities`                                                                                                     |
| `type`                 | wajib, `BoardType`                                                                                                                                    |
| `managerTitle`         | opsional, maks 80 karakter                                                                                                                            |
| `description`          | wajib, 20 sampai 1000 karakter                                                                                                                        |
| `extraCategories`      | opsional, array maks 10, tiap item 2 sampai 40 karakter, tidak boleh sama dengan kategori bawaan atau sesamanya (tanpa memedulikan huruf besar kecil) |
| `dangerousTargetHours` | opsional, bilangan bulat 1 sampai 720, default 48                                                                                                     |

Sukses `201`: `{ "data": <Board> }`

Error:

| Status | Code                  | Kapan                                     |
| ------ | --------------------- | ----------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak valid atau kota tidak dikenal |
| 401    | `UNAUTHENTICATED`     | Belum login                               |
| 403    | `BOARD_LIMIT_REACHED` | User sudah memiliki 3 board sebagai OWNER |
| 429    | `RATE_LIMITED`        | Terlalu banyak permintaan                 |

### GET /api/boards/search

Auth: Publik. Mencari board untuk kolom pencarian di header dan halaman Hasil Pencarian.

Query:

| Field              | Aturan                                                     |
| ------------------ | ---------------------------------------------------------- |
| `q`                | opsional, 2 sampai 80 karakter. Kosong berarti semua board |
| `city`             | opsional, nama kota dari daftar kota                       |
| `type`             | opsional, `BoardType`                                      |
| `verification`     | opsional, `BoardVerification`                              |
| `page`, `pageSize` | pagination standar                                         |

Urutan: nama paling cocok (sama persis, lalu diawali `q`, lalu mengandung `q`), lalu board `OFFICIAL`, lalu `trustScore` tertinggi, lalu `activeReportCount` terbanyak.

Sukses `200`:

```json
{
  "data": [<BoardCard>],
  "meta": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

Error: `400 VALIDATION_ERROR`.

### GET /api/boards/similar

Auth: Publik. Dipakai di form Buat Board untuk memperingatkan board yang mirip di kota yang sama. Hanya peringatan, bukan larangan.

Query:

| Field  | Aturan                            |
| ------ | --------------------------------- |
| `name` | wajib, 3 sampai 80 karakter       |
| `city` | wajib, nama kota dari daftar kota |

Sukses `200`: maksimal 5 board.

```json
{ "data": [<BoardCard>] }
```

Error: `400 VALIDATION_ERROR`.

### GET /api/boards/:slug

Auth: Publik.

Sukses `200`: `{ "data": <Board> }`

Error: `404 BOARD_NOT_FOUND`.

### PATCH /api/boards/:slug

Auth: OWNER. Mengubah pengaturan board. Semua field opsional, minimal satu field dikirim.

Body:

```json
{
  "name": "Jalan Rungkut Madya Raya",
  "managerTitle": "Lurah Rungkut",
  "description": "Deskripsi dan cakupan baru board ini.",
  "dangerousTargetHours": 24
}
```

Aturan field sama seperti `POST /api/boards`. `city` dan `type` tidak bisa diubah. Slug tidak berubah. `verification` tidak bisa diubah lewat endpoint ini, karena hanya Admin Board yang boleh mengubahnya (endpoint verifikasi dibuat di Fase 8).

Sukses `200`: `{ "data": <Board> }`

Error:

| Status | Code               | Kapan                              |
| ------ | ------------------ | ---------------------------------- |
| 400    | `VALIDATION_ERROR` | Input tidak valid atau body kosong |
| 401    | `UNAUTHENTICATED`  | Belum login                        |
| 403    | `FORBIDDEN`        | Bukan OWNER board ini              |
| 404    | `BOARD_NOT_FOUND`  | Slug tidak ada                     |

### POST /api/boards/:slug/categories

Auth: OWNER. Menambah kategori laporan.

Body:

```json
{ "name": "Parkir Liar" }
```

`name` wajib, 2 sampai 40 karakter. Maksimal 20 kategori per board.

Sukses `201`:

```json
{ "data": { "id": 21, "name": "Parkir Liar", "isDefault": false } }
```

Error:

| Status | Code                     | Kapan                                                                 |
| ------ | ------------------------ | --------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`       | Input tidak valid                                                     |
| 401    | `UNAUTHENTICATED`        | Belum login                                                           |
| 403    | `FORBIDDEN`              | Bukan OWNER                                                           |
| 403    | `CATEGORY_LIMIT_REACHED` | Sudah 20 kategori                                                     |
| 404    | `BOARD_NOT_FOUND`        | Slug tidak ada                                                        |
| 409    | `CATEGORY_EXISTS`        | Nama sudah dipakai di board ini (tanpa memedulikan huruf besar kecil) |

### PATCH /api/boards/:slug/categories/:id

Auth: OWNER. Mengganti nama kategori, termasuk kategori bawaan, kecuali "Lainnya".

Body: `{ "name": "Parkir Sembarangan" }`

Sukses `200`: `{ "data": { "id": 21, "name": "Parkir Sembarangan", "isDefault": false } }`

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 CATEGORY_NOT_FOUND`, `409 CATEGORY_EXISTS`, `409 CATEGORY_PROTECTED` (kategori "Lainnya").

### DELETE /api/boards/:slug/categories/:id

Auth: OWNER. Menghapus kategori. Kategori yang sudah dipakai laporan (mulai Fase 4) diarsipkan, bukan dihapus permanen, sehingga laporan lama tetap menampilkan namanya.

Sukses `200`:

```json
{ "data": { "id": 21, "deleted": true } }
```

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 CATEGORY_NOT_FOUND`, `409 CATEGORY_PROTECTED` (kategori "Lainnya" tidak bisa dihapus).

### PUT /api/boards/:slug/categories/order

Auth: OWNER. Mengubah urutan kategori pada board.

Body berisi semua ID kategori di board tepat satu kali, dalam urutan yang diinginkan:

```json
{ "categoryIds": [10, 15, 21] }
```

Sukses `200`: `{ "data": [<Category>] }` dalam urutan baru. Urutan array dipakai sebagai urutan kategori.

Error: `400 VALIDATION_ERROR` jika daftar kosong, ada ID duplikat, atau bentuk input tidak valid; `401 UNAUTHENTICATED`; `403 FORBIDDEN`; `404 BOARD_NOT_FOUND`; `404 CATEGORY_NOT_FOUND` jika ID kategori tidak cocok dengan kategori di board tersebut.

### GET /api/me/boards

Auth: Login. Daftar board tempat user menjadi Penindak Utama atau Penindak.

Sukses `200`:

```json
{
  "data": [{ "board": <BoardCard>, "role": "OWNER" }]
}
```

Urutan: `OWNER` dulu, lalu nama A sampai Z.

Error: `401 UNAUTHENTICATED`.

### GET /api/meta/cities

Auth: Publik. Daftar kota yang boleh dipilih untuk board. Data tetap disimpan di `shared`.

Sukses `200`:

```json
{
  "data": [
    { "name": "Surabaya", "province": "Jawa Timur" },
    { "name": "Sidoarjo", "province": "Jawa Timur" }
  ]
}
```

Urutan: provinsi A sampai Z, lalu nama kota A sampai Z.

---

## Fase 3: Ikuti Board dan Penindak

### Enum Follow dan Anggota Board

| Enum                | Nilai                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| `FollowNotifyLevel` | `ALL` (Semua laporan), `DANGEROUS_ONLY` (Hanya Berbahaya), `OFF` (Mati) |
| `BoardMemberStatus` | `INVITED` (Diundang), `ACTIVE` (Aktif)                                  |

Untuk user yang login, objek `BoardCard` dan `Board` mengisi `viewer`:

```json
{ "isFollowing": true, "notifyLevel": "ALL", "role": null }
```

Tamu mendapat `viewer: null`. `role` bernilai `OWNER`, `HANDLER`, atau `null` untuk user biasa. Penindak Utama dan Penindak tidak dapat mengikuti Board yang mereka kelola. Status verifikasi tidak dapat diubah lewat endpoint pengikut, anggota, atau alih kepemilikan.

### POST /api/boards/:slug/follow

Auth: Login. Mengikuti Board dengan notifikasi awal `ALL`. Idempoten; jika sudah mengikuti, status tidak berubah.

Sukses `200`: `{ "data": { "notifyLevel": "ALL" } }`.

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN` jika pemanggil adalah Penindak Board, `404 BOARD_NOT_FOUND`.

### DELETE /api/boards/:slug/follow

Auth: Login. Berhenti mengikuti Board. Idempoten; jika belum mengikuti, tidak ada perubahan.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`, `404 BOARD_NOT_FOUND`.

### PATCH /api/boards/:slug/follow

Auth: Login. Mengubah tingkat notifikasi Board yang sedang diikuti.

Body: `{ "notifyLevel": "DANGEROUS_ONLY" }`. Nilai yang diterima: `ALL`, `DANGEROUS_ONLY`, atau `OFF`.

Sukses `200`: `{ "data": { "notifyLevel": "DANGEROUS_ONLY" } }`.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 BOARD_NOT_FOUND`, `404 FOLLOW_NOT_FOUND`.

### GET /api/me/follows

Auth: Login. Daftar Board yang diikuti user.

Sukses `200`:

```json
{
  "data": [
    {
      "board": <BoardCard>,
      "notifyLevel": "ALL",
      "createdAt": "2026-10-04T08:14:00.000Z"
    }
  ]
}
```

Urutan: yang terbaru diikuti lebih dahulu.

### Objek BoardMember

```json
{
  "userId": 18,
  "role": "HANDLER",
  "status": "INVITED",
  "createdAt": "2026-10-04T08:14:00.000Z",
  "user": { "id": 18, "name": "Dewi Lestari", "email": "dewi@example.com", "avatarUrl": null }
}
```

### POST /api/boards/:slug/handlers

Auth: OWNER. Mengundang akun yang sudah terdaftar menjadi Penindak.

Body: `{ "email": "dewi@example.com" }`.

Sukses `201`: `{ "data": <BoardMember> }` dengan status `INVITED`. Maksimal 10 Penindak per Board, termasuk undangan yang belum dijawab.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 USER_NOT_FOUND`, `409 HANDLER_ALREADY_MEMBER`, `409 HANDLER_LIMIT_REACHED`.

### GET /api/boards/:slug/handlers

Auth: OWNER atau HANDLER. Mengambil anggota Penindak di Board.

Sukses `200`: `{ "data": [<BoardMember>] }`.

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`.

### DELETE /api/boards/:slug/handlers/:userId

Auth: OWNER. Mencabut keanggotaan HANDLER aktif atau membatalkan undangan. OWNER tidak dapat mencabut dirinya sendiri.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN` atau `403 CANNOT_REMOVE_OWNER`, `404 BOARD_NOT_FOUND`, `404 HANDLER_NOT_FOUND`.

### GET /api/me/invitations

Auth: Login. Mengambil undangan Penindak yang masih menunggu jawaban.

Sukses `200`:

```json
{
  "data": [
    {
      "id": 24,
      "board": <BoardCard>,
      "createdAt": "2026-10-04T08:14:00.000Z"
    }
  ]
}
```

### POST /api/me/invitations/:id/accept

Auth: Login sebagai penerima undangan. Mengaktifkan keanggotaan HANDLER.

Sukses `200`: `{ "data": <BoardMember> }` dengan status `ACTIVE`.

Error: `401 UNAUTHENTICATED`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`.

### POST /api/me/invitations/:id/decline

Auth: Login sebagai penerima undangan. Menolak dan menghapus undangan.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`.

### POST /api/boards/:slug/transfer

Auth: OWNER. Mengalihkan kepemilikan kepada Penindak berstatus `ACTIVE`.

Body: `{ "userId": 18 }`.

Sukses `200`: `{ "data": <Board> }`. Perubahan OWNER dan HANDLER dilakukan dalam satu transaksi. Penerima harus tetap berada dalam batas tiga Board milik. Field `verification` dan `verifiedAt` tidak berubah saat kepemilikan dialihkan.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 HANDLER_NOT_FOUND`, `409 BOARD_LIMIT_REACHED`.

### Perubahan data Board

`GET /api/boards/:slug` dan `GET /api/boards/search` mengisi `followerCount` dari jumlah pengikut sebenarnya. Untuk user login, respons juga mengisi `viewer.isFollowing`, `viewer.notifyLevel`, dan `viewer.role`; untuk tamu, `viewer` bernilai `null`.
