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

| Status | Code                  | Arti                                           |
| ------ | --------------------- | ---------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak lolos skema Zod                    |
| 400    | `INVALID_JSON`        | Body bukan JSON yang valid                     |
| 401    | `UNAUTHENTICATED`     | Wajib login                                    |
| 403    | `FORBIDDEN`           | Sudah login tapi tidak punya hak akses         |
| 404    | `NOT_FOUND`           | Endpoint atau data tidak ditemukan             |
| 409    | `CONFLICT`            | Data bentrok (misalnya nilai unik sudah ada)   |
| 413    | `PAYLOAD_TOO_LARGE`   | Body melebihi 1 MB                             |
| 429    | `RATE_LIMITED`        | Terlalu banyak permintaan                      |
| 503    | `SERVICE_UNAVAILABLE` | Database atau layanan pendukung tidak tersedia |
| 500    | `INTERNAL_ERROR`      | Error tak terduga, detail tidak dibocorkan     |

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

### Objek User

```json
{
  "id": 12,
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "avatarUrl": null,
  "role": "USER",
  "hasPassword": true,
  "hasGoogle": false,
  "needsOnboarding": true,
  "createdAt": "2026-10-03T08:14:00.000Z"
}
```

- `role`: `USER` atau `ADMIN`. Admin ditentukan dari env `ADMIN_EMAILS`.
- `needsOnboarding`: `true` sampai user melewati Halaman Sambutan (endpoint penyelesaiannya dibuat di fase berikutnya).
- Password dan hash tidak pernah dikirim.

### Catatan Ban

Pengecekan ban akun (`403 ACCOUNT_BANNED` saat login dan redirect `/login?error=account_banned` dari callback Google) ditunda ke Fase 7 Moderasi, bersama tabel ban akun, perangkat, dan IP. Sampai Fase 7, login tidak pernah membalas `ACCOUNT_BANNED`.

### Aturan Session

- Nama cookie `tindak.sid`, httpOnly, `sameSite=lax`, `secure` di production, umur 30 hari.
- Session ID diganti (regenerate) setiap login dan register untuk mencegah session fixation.
- Session disimpan di tabel `sessions`. Session kedaluwarsa dibersihkan otomatis setiap 15 menit.
- Cookie hanya dibuat saat login atau saat memulai login Google. Tamu yang hanya membuka halaman tidak mendapat cookie.

### POST /api/auth/register

Auth: Publik. Rate limit: 10 per 15 menit per IP. Mendaftar dengan email dan password, lalu langsung login.

Body:

```json
{ "name": "Budi Santoso", "email": "budi@example.com", "password": "rahasia123" }
```

| Field      | Aturan                                                       |
| ---------- | ------------------------------------------------------------ |
| `name`     | wajib, string 2 sampai 50 karakter, di-trim                  |
| `email`    | wajib, format email, maks 191 karakter, disimpan huruf kecil |
| `password` | wajib, 8 sampai 72 karakter, minimal 1 huruf dan 1 angka     |

Sukses `201`: `{ "data": <User> }` dan cookie session dipasang.

Error:

| Status | Code               | Kapan                                        |
| ------ | ------------------ | -------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Input tidak valid                            |
| 409    | `EMAIL_TAKEN`      | Email sudah terdaftar (termasuk akun Google) |
| 429    | `RATE_LIMITED`     | Terlalu banyak percobaan                     |

### POST /api/auth/login

Auth: Publik. Rate limit: 10 percobaan **gagal** per 15 menit per kombinasi IP dan email. Login yang berhasil tidak dihitung.

Body:

```json
{ "email": "budi@example.com", "password": "rahasia123" }
```

Sukses `200`: `{ "data": <User> }` dan cookie session dipasang.

Error:

| Status | Code                  | Kapan                                                                                       |
| ------ | --------------------- | ------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak valid                                                                           |
| 401    | `INVALID_CREDENTIALS` | Email tidak ada, password salah, atau akun hanya punya Google. Pesan sama untuk semua kasus |
| 429    | `RATE_LIMITED`        | Terlalu banyak percobaan                                                                    |

### POST /api/auth/logout

Auth: Login. Menghapus session dan cookie.

Sukses `200`:

```json
{ "data": { "loggedOut": true } }
```

Error: `401 UNAUTHENTICATED`.

### GET /api/auth/me

Auth: Publik. Dipakai frontend saat aplikasi dibuka.

Sukses `200`:

- Sudah login: `{ "data": <User> }`
- Tamu: `{ "data": null }`

Tamu sengaja tidak dibalas 401 agar frontend tidak menganggapnya error.

### GET /api/auth/google

Auth: Publik. Mengarahkan browser ke halaman login Google (`302`).

Query:

| Field      | Aturan                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `redirect` | opsional, path relatif tujuan setelah login, contoh `/b/jalan-rungkut-madya-surabaya`. Harus diawali `/` dan bukan `//`. Nilai tidak valid diganti `/` |

Endpoint ini dibuka lewat navigasi browser (`window.location.href`), bukan fetch.

Jika login Google belum dikonfigurasi di server, endpoint ini langsung `302` ke `CLIENT_URL/login?error=google_unavailable`. Frontend sebaiknya menampilkan pesan "Login Google belum tersedia".

### GET /api/auth/google/callback

Auth: Publik. Dipanggil oleh Google, bukan oleh frontend.

- Berhasil: buat atau tautkan akun (email Google yang sama dengan akun email+password otomatis ditautkan), pasang session, lalu `302` ke `CLIENT_URL + redirect`.
- Gagal atau dibatalkan: `302` ke `CLIENT_URL/login?error=google_failed`.
- Login Google belum dikonfigurasi di server (env `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` kosong): `302` ke `CLIENT_URL/login?error=google_unavailable`.

---

## Fase 2: Board

### Enum Board

| Enum            | Nilai                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BoardType`     | `SCHOOL` (Sekolah), `CAMPUS` (Kampus), `OFFICE` (Kantor), `ROAD` (Jalan), `AREA` (Wilayah RT/RW/Kelurahan), `PUBLIC_FACILITY` (Fasilitas Umum), `OTHER` (Lainnya) |
| `ManagerStatus` | `OFFICIAL` (Pihak Resmi), `VOLUNTEER` (Relawan/Komunitas)                                                                                                         |
| `BoardRole`     | `OWNER` (Penindak Utama), `HANDLER` (Penindak)                                                                                                                    |
| `TrustLabel`    | `NEW` (🆕 Baru), `TRUSTED` (✅ Terpercaya), `NONE` (tanpa label), `CAUTION` (⚠️ Perlu Waspada), `INACTIVE` (💤 Tidak Aktif)                                       |

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
  "managerStatus": "VOLUNTEER",
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

### POST /api/boards

Auth: Login. Rate limit: 10 per jam per user. Membuat board baru. Pembuat otomatis menjadi `OWNER`.

Body:

```json
{
  "name": "Jalan Rungkut Madya",
  "city": "Surabaya",
  "type": "ROAD",
  "managerStatus": "VOLUNTEER",
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
| `managerStatus`        | wajib, `ManagerStatus`                                                                                                                                |
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
| `managerStatus`    | opsional, `ManagerStatus`                                  |
| `page`, `pageSize` | pagination standar                                         |

Urutan: nama paling cocok (sama persis, lalu diawali `q`, lalu mengandung `q`), lalu `trustScore` tertinggi, lalu `activeReportCount` terbanyak.

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
  "managerStatus": "OFFICIAL",
  "managerTitle": "Lurah Rungkut",
  "description": "Deskripsi dan cakupan baru board ini.",
  "dangerousTargetHours": 24
}
```

Aturan field sama seperti `POST /api/boards`. `city` dan `type` tidak bisa diubah. Slug tidak berubah.

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
