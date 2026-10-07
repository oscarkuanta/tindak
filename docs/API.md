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
| 403    | `ACCOUNT_BANNED`      | Akun, perangkat, atau IP sedang di-ban (Fase 7)            |
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

- `role`: role tingkat website. `USER`, `ADMIN` (moderator), atau `BOARD_ADMIN` (pemberi status Official). Satu akun hanya punya satu role.
- Saat daftar atau login (email maupun Google): email di env `ADMIN_EMAILS` menjadi `ADMIN`. Jika tidak, email di `BOARD_ADMIN_EMAILS` menjadi `BOARD_ADMIN`. Jika ada di kedua daftar, `ADMIN` yang dipakai. Role juga bisa diberikan lewat `npm run make-admin -- email` atau `npm run make-board-admin -- email`. Role `ADMIN` tidak pernah diturunkan otomatis.
- Middleware server: `requireAdmin` hanya untuk `ADMIN`, `requireBoardAdmin` hanya untuk `BOARD_ADMIN` (`ADMIN` juga ditolak, karena memberi status Official adalah tugas khusus Admin Board).
- `hasPassword`: `false` untuk akun yang hanya bisa masuk lewat Google.
- `needsOnboarding`: `true` sampai user melewati Halaman Sambutan (endpoint penyelesaiannya dibuat di fase berikutnya).
- `passwordHash` dan `googleId` tidak pernah dikirim.

### Catatan Ban

Mulai Fase 7, login email dan Google ditolak dengan `403 ACCOUNT_BANNED` jika akun sedang di-ban. Format lengkap ada di bagian Fase 7.

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
| `BoardStatus`       | `ACTIVE` (Aktif), `INACTIVE` (💤 Tidak Aktif, Penindak tidak aktif 30 hari), `FROZEN` (dibekukan Admin)                                                           |
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
  "city": "Kota Surabaya",
  "type": "ROAD",
  "verification": "COMMUNITY",
  "verifiedAt": null,
  "coverImageUrl": null,
  "status": "ACTIVE",
  "trustScore": 3.0,
  "trustLabel": "NEW",
  "ratingCount": 0,
  "followerCount": 0,
  "activeReportCount": 0,
  "createdAt": "2026-10-03T08:14:00.000Z"
}
```

### Objek Board (detail)

Semua field BoardCard ditambah:

```json
{
  "managerTitle": "Ketua RT 05",
  "description": "Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.",
  "dangerousTargetHours": 48,
  "averageStars": null,
  "responseRate": null,
  "rejectedPercentage": 0,
  "verificationHistory": [],
  "handlerCount": 1,
  "isInactive": false,
  "owner": { "id": 5, "name": "Budi Santoso", "avatarUrl": null },
  "categories": [
    { "id": 10, "name": "Jalan Berlubang", "isDefault": true, "sortOrder": 0 },
    { "id": 15, "name": "Lainnya", "isDefault": true, "sortOrder": 5 }
  ],
  "viewer": { "isFollowing": false, "notifyLevel": null, "role": "OWNER" }
}
```

- `slug` dibuat dari nama dan kota tanpa awalan Kota/Kabupaten/Administrasi, contoh `Jalan Rungkut Madya` + `Kota Surabaya` menjadi `jalan-rungkut-madya-surabaya`. Unik. Jika sudah dipakai, diberi akhiran `-2`, `-3`, dan seterusnya. Slug tidak berubah walaupun nama diganti.
- `trustScore`, `trustLabel`, `ratingCount`, `averageStars`, `responseRate`, `rejectedPercentage`, dan `verificationHistory` dijelaskan di bagian Fase 8. `followerCount` adalah jumlah pengikut sebenarnya.
- `handlerCount` adalah jumlah anggota Board berstatus aktif, termasuk Penindak Utama.
- `owner` adalah Penindak Utama saat ini.
- Board `FROZEN` tidak muncul di pencarian dan detailnya membalas `404 BOARD_NOT_FOUND`, kecuali untuk user dengan role website `ADMIN` atau `BOARD_ADMIN`.
- `viewer` bernilai `null` untuk tamu. `viewer.role` bernilai `OWNER`, `HANDLER`, atau `null`. `viewer.isFollowing` dan `viewer.notifyLevel` (`ALL`, `DANGEROUS_ONLY`, `OFF`, atau `null` jika tidak mengikuti) mengikuti data Fase 3. Semua respons yang berisi BoardCard (pencarian, Board mirip, `me/boards`, `me/follows`, `me/invitations`) juga mengisi `viewer`.
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
| `city`                 | wajib, nama resmi persis seperti di `GET /api/meta/cities`, contoh `Kota Surabaya` atau `Kabupaten Sidoarjo`                                          |
| `type`                 | wajib, `BoardType`                                                                                                                                    |
| `managerTitle`         | opsional, maks 80 karakter                                                                                                                            |
| `description`          | wajib, 20 sampai 1000 karakter                                                                                                                        |
| `extraCategories`      | opsional, array maks 10, tiap item 2 sampai 40 karakter, tidak boleh sama dengan kategori bawaan atau sesamanya (tanpa memedulikan huruf besar kecil) |
| `dangerousTargetHours` | opsional, bilangan bulat 1 sampai 720, default 48                                                                                                     |

Sukses `201`: `{ "data": <Board> }`

Error:

| Status | Code                  | Kapan                                                                                                                                                                                              |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Input tidak valid, kota tidak dikenal, atau ada field yang tidak dikenal (misalnya `verification`, `status`, `slug`). Field asing muncul di `details` dengan pesan "Field ini tidak boleh dikirim" |
| 401    | `UNAUTHENTICATED`     | Belum login                                                                                                                                                                                        |
| 403    | `BOARD_LIMIT_REACHED` | User sudah memiliki 3 board sebagai OWNER                                                                                                                                                          |
| 429    | `RATE_LIMITED`        | Terlalu banyak permintaan                                                                                                                                                                          |

### GET /api/boards/search

Auth: Publik. Mencari board untuk kolom pencarian di header dan halaman Hasil Pencarian.

Query:

| Field              | Aturan                                                     |
| ------------------ | ---------------------------------------------------------- |
| `q`                | opsional, 2 sampai 80 karakter. Kosong berarti semua board |
| `city`             | opsional, nama kota dari daftar kota                       |
| `type`             | opsional, `BoardType`                                      |
| `verification`     | opsional, `BoardVerification`                              |
| `page`, `pageSize` | pagination standar (`pageSize` default 20, maks 50)        |

Board `FROZEN` tidak pernah muncul. Parameter kosong (`q=`) dianggap tidak dikirim.

Urutan: nama paling cocok (sama persis, lalu diawali `q`, lalu mengandung `q`), lalu board `OFFICIAL`, lalu `trustScore` tertinggi (`null` paling bawah), lalu `activeReportCount` terbanyak, lalu aktivitas Penindak terbaru, lalu yang paling baru dibuat. Seluruh urutan ada di satu fungsi `compareSearchResults` di `server/src/modules/boards/boards.ranking.js`.

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

Cara mencari: nama dipecah menjadi kata (minimal 3 huruf). Kata umum seperti jalan, jl, raya, sekolah, smk, sma, kampus, kantor, perumahan, rt, rw, kelurahan diabaikan selama masih ada kata lain, supaya "Jalan A" tidak dianggap mirip dengan semua "Jalan B". Board di kota yang sama yang namanya memuat salah satu kata diambil, lalu diurutkan dari yang paling banyak kata cocok, kemudian kecocokan nama, lalu Official. Board `FROZEN` diabaikan.

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

Aturan field sama seperti `POST /api/boards`. Field yang tidak dikirim tidak berubah. `managerTitle` boleh `""` atau `null` untuk mengosongkan jabatan. `slug`, `city`, `type`, `status`, dan `verification` tidak bisa diubah: mengirim field selain empat field di atas membalas `400 VALIDATION_ERROR`. `verification` hanya diubah Admin Board lewat endpoint verifikasi di Fase 8.

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

`name` wajib, 2 sampai 40 karakter. Maksimal 20 kategori per board. Kategori baru ditaruh di urutan terakhir.

Sukses `201`:

```json
{ "data": { "id": 21, "name": "Parkir Liar", "isDefault": false, "sortOrder": 6 } }
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

Auth: OWNER. Mengganti nama dan/atau urutan kategori. Nama kategori bawaan boleh diganti, kecuali "Lainnya". Urutan "Lainnya" boleh diubah.

Body: `{ "name": "Parkir Sembarangan", "sortOrder": 3 }`. Minimal salah satu field dikirim. `sortOrder` bilangan bulat mulai 0. Untuk mengurutkan banyak kategori sekaligus, pakai `PUT /api/boards/:slug/categories/order`.

Sukses `200`: `{ "data": { "id": 21, "name": "Parkir Sembarangan", "isDefault": false, "sortOrder": 3 } }`

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 CATEGORY_NOT_FOUND`, `409 CATEGORY_EXISTS`, `409 CATEGORY_PROTECTED` (kategori "Lainnya").

### DELETE /api/boards/:slug/categories/:id

Auth: OWNER. Menghapus kategori. Kategori "Lainnya" tidak bisa dihapus, sehingga setiap board selalu punya minimal satu kategori. Kategori yang sudah dipakai laporan juga tidak bisa dihapus (`409 CATEGORY_IN_USE`), supaya laporan lama tetap menampilkan namanya.

Sukses `200`:

```json
{ "data": { "id": 21, "deleted": true } }
```

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 CATEGORY_NOT_FOUND`, `409 CATEGORY_PROTECTED` (kategori "Lainnya" tidak bisa dihapus), `409 CATEGORY_IN_USE` (sudah dipakai laporan).

### PUT /api/boards/:slug/categories/order

Auth: OWNER. Mengubah urutan kategori pada board.

Body berisi semua ID kategori di board tepat satu kali, dalam urutan yang diinginkan:

```json
{ "categoryIds": [10, 15, 21] }
```

Sukses `200`: `{ "data": [<Category>] }` dalam urutan baru. Urutan array dipakai sebagai urutan kategori.

Error: `400 VALIDATION_ERROR` jika daftar kosong, ada ID duplikat, ada kategori board yang tidak disertakan, atau bentuk input tidak valid; `401 UNAUTHENTICATED`; `403 FORBIDDEN`; `404 BOARD_NOT_FOUND`; `404 CATEGORY_NOT_FOUND` jika ID kategori tidak cocok dengan kategori di board tersebut.

### GET /api/me/boards

Auth: Login. Daftar board tempat user menjadi Penindak Utama atau Penindak dengan status `ACTIVE`. Undangan yang belum diterima (`INVITED`) tidak ikut.

Sukses `200`:

```json
{
  "data": [{ "board": <BoardCard>, "role": "OWNER" }]
}
```

Urutan: `OWNER` dulu, lalu nama A sampai Z.

Error: `401 UNAUTHENTICATED`.

### GET /api/meta/cities

Auth: Publik. Daftar 514 kabupaten dan kota di Indonesia yang boleh dipilih untuk board, dengan nama resmi (contoh `Kota Surabaya`, `Kabupaten Sidoarjo`, `Kota Administrasi Jakarta Selatan`). Nama resmi dipakai karena banyak daerah punya versi Kota dan Kabupaten, misalnya Malang dan Bogor. Data statis di `shared/src/constants/cities.js` (`CITIES`), sumber Kepmendagri No 300.2.2-2138 Tahun 2025.

Query:

| Field | Aturan                                                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`   | opsional, maks 80 karakter. Tanpa `q`: semua kota. Dengan `q`: maksimal 20 kota yang namanya diawali atau mengandung `q` (awalan Kota/Kabupaten diabaikan saat mencocokkan awalan) |

Sukses `200`:

```json
{
  "data": [
    { "name": "Kabupaten Sidoarjo", "province": "Jawa Timur" },
    { "name": "Kota Surabaya", "province": "Jawa Timur" }
  ]
}
```

Urutan tanpa `q`: provinsi A sampai Z, lalu nama A sampai Z. Dengan `q`: yang diawali `q` dulu.

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

Auth: Login. Mengikuti Board dengan notifikasi awal `ALL`. Idempoten; jika sudah mengikuti, status dan `notifyLevel` tidak berubah. Tanpa body.

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

Auth: Login. Daftar Board yang diikuti user. Board `FROZEN` tidak ditampilkan.

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

Body: `{ "email": "dewi@example.com" }`. Hanya field `email` yang diterima. Rate limit 30 undangan per jam. Mengundang diri sendiri atau anggota yang sudah ada (aktif maupun diundang) membalas `409 HANDLER_ALREADY_MEMBER`.

Sukses `201`: `{ "data": <BoardMember> }` dengan status `INVITED`. Maksimal 10 Penindak per Board, termasuk undangan yang belum dijawab.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 USER_NOT_FOUND`, `409 HANDLER_ALREADY_MEMBER`, `409 HANDLER_LIMIT_REACHED`.

### GET /api/boards/:slug/handlers

Auth: OWNER atau HANDLER aktif. Mengambil anggota dengan role `HANDLER` (aktif dan yang masih diundang). Penindak Utama tidak ikut di daftar ini, karena datanya sudah ada di `owner` pada detail Board. Urutan: `ACTIVE` dulu, lalu yang paling lama bergabung.

Sukses `200`: `{ "data": [<BoardMember>] }`.

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`.

### DELETE /api/boards/:slug/handlers/:userId

Auth: OWNER. Mencabut keanggotaan HANDLER aktif atau membatalkan undangan. OWNER tidak dapat mencabut dirinya sendiri.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN` atau `403 CANNOT_REMOVE_OWNER`, `404 BOARD_NOT_FOUND`, `404 HANDLER_NOT_FOUND`.

### GET /api/me/invitations

Auth: Login. Mengambil undangan Penindak yang masih menunggu jawaban, terbaru lebih dulu. Undangan ke Board `FROZEN` tidak ditampilkan. Undangan milik user lain dianggap tidak ada (`404 INVITATION_NOT_FOUND`).

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

Auth: Login sebagai penerima undangan. Mengaktifkan keanggotaan HANDLER. Jika penerima sedang mengikuti Board itu, status mengikutinya dihapus, karena Penindak tidak mengikuti Board yang dikelolanya.

Sukses `200`: `{ "data": <BoardMember> }` dengan status `ACTIVE`.

Error: `401 UNAUTHENTICATED`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`.

### POST /api/me/invitations/:id/decline

Auth: Login sebagai penerima undangan. Menolak dan menghapus undangan.

Sukses `204` tanpa body.

Error: `401 UNAUTHENTICATED`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`.

### POST /api/boards/:slug/transfer

Auth: OWNER. Mengalihkan kepemilikan kepada Penindak berstatus `ACTIVE`.

Body: `{ "userId": 18 }`. Hanya field `userId` yang diterima; field lain seperti `verification` membalas `400 VALIDATION_ERROR`.

Sukses `200`: `{ "data": <Board> }` dilihat dari sudut pandang pemilik lama (`viewer.role` sekarang `HANDLER`, `owner` sudah berganti). `Board.ownerId` ikut pindah, sehingga batas tiga Board milik dihitung untuk pemilik baru. Perubahan OWNER dan HANDLER dilakukan dalam satu transaksi. Penerima harus tetap berada dalam batas tiga Board milik. Field `verification` dan `verifiedAt` tidak berubah saat kepemilikan dialihkan. Server mencatat audit `BOARD_OWNER_CHANGED`. Jika Board berstatus Official, semua Admin Board menerima notifikasi `BOARD_OWNER_CHANGED` (lihat Fase 9).

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 HANDLER_NOT_FOUND`, `409 BOARD_LIMIT_REACHED`.

### Perubahan data Board

`GET /api/boards/:slug` dan `GET /api/boards/search` mengisi `followerCount` dari jumlah pengikut sebenarnya. Untuk user login, respons juga mengisi `viewer.isFollowing`, `viewer.notifyLevel`, dan `viewer.role`; untuk tamu, `viewer` bernilai `null`.

---

## Fase 4: Laporan dan Tamu

Kontrak berikut dipakai frontend Fase 4B dan diimplementasikan backend Fase 4A.

### Enum dan objek Laporan

`severity`: `LOW`, `MEDIUM`, atau `DANGEROUS`.

`status`: `NEW`, `NEED_INFO`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `RESOLVED`, `REOPENED`, `REJECTED`, atau `DUPLICATE`. Status aktif (dihitung di `activeReportCount` Board): `NEW`, `NEED_INFO`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `REOPENED`.

Objek `Report` (dipakai di daftar):

```json
{
  "id": 41,
  "board": {
    "id": 3,
    "slug": "jalan-rungkut-madya-surabaya",
    "name": "Jalan Rungkut Madya",
    "status": "ACTIVE"
  },
  "category": { "id": 10, "name": "Jalan Berlubang" },
  "isAnonymous": false,
  "reporter": { "id": 5, "name": "Budi Santoso", "avatarUrl": null },
  "title": "Lubang besar di depan Indomaret",
  "description": "Lubang selebar satu meter dan cukup dalam.",
  "locationDetail": "Depan Indomaret Rungkut Madya",
  "severity": "DANGEROUS",
  "status": "NEW",
  "media": [
    {
      "id": 7,
      "url": "/api/uploads/muw2f5nc-vWpxHjvu.webp",
      "kind": "BEFORE",
      "isBlurred": false,
      "createdAt": "2026-10-06T04:24:00.000Z"
    }
  ],
  "dueAt": "2026-10-08T04:24:00.000Z",
  "isOverdue": false,
  "createdAt": "2026-10-06T04:24:00.000Z",
  "updatedAt": "2026-10-06T04:24:00.000Z"
}
```

- `reporter` bernilai `null` jika laporan anonim atau dibuat tamu. Frontend menampilkan "Anonim".
- `media[].url` adalah path relatif di bawah `/api/uploads/`, sehingga tetap lewat proxy Vite di development. Semua foto disimpan sebagai WebP tanpa metadata EXIF/GPS, maksimal 1600 px.
- `isBlurred` bernilai `true` untuk foto yang dicurigai tidak pantas (skor NSFW 0,4 sampai 0,7). Frontend sebaiknya memburamkannya.
- `dueAt` hanya diisi untuk `DANGEROUS`: waktu dibuat ditambah `dangerousTargetHours` Board. `isOverdue` benar jika `dueAt` sudah lewat dan status belum `AWAITING_CONFIRMATION`, `RESOLVED`, `REJECTED`, atau `DUPLICATE`.

Objek `Report detail` (dipakai `GET /api/reports/:id` dan `GET /api/track/:code`) berisi semua field di atas ditambah:

```json
{
  "reopenCount": 0,
  "reporterNotSatisfied": false,
  "parent": null,
  "infoRequest": null,
  "timeline": [
    {
      "id": 1,
      "fromStatus": null,
      "toStatus": "NEW",
      "actorType": "REPORTER",
      "actor": null,
      "reason": null,
      "note": "Laporan dibuat",
      "createdAt": "2026-10-06T04:24:00.000Z"
    }
  ],
  "allowedActions": [],
  "reporterType": "ACCOUNT"
}
```

- `reporterType` (`GUEST` atau `ACCOUNT`) hanya dikirim kepada Penindak aktif Board tersebut dan Admin.
- `timeline.actor` bernilai `null` untuk aksi pelapor anonim.
- Sampai Fase 5A, `allowedActions` selalu `[]`, `infoRequest` dan `parent` selalu `null`.

### POST /api/boards/:slug/reports

Auth: opsional (tamu atau login). Menerima `multipart/form-data`.

| Field            | Aturan                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | wajib, 1 sampai 100 karakter                                                                                                         |
| `categoryId`     | wajib, ID kategori milik Board ini                                                                                                   |
| `severity`       | wajib, `LOW`, `MEDIUM`, atau `DANGEROUS`                                                                                             |
| `locationDetail` | wajib, 1 sampai 200 karakter                                                                                                         |
| `description`    | wajib, 20 sampai 2000 karakter                                                                                                       |
| `isAnonymous`    | opsional, `"true"` atau `"false"`. Tamu selalu anonim apa pun nilainya                                                               |
| `turnstileToken` | wajib, token Cloudflare Turnstile dari widget                                                                                        |
| `photos`         | wajib 1 sampai 4 file, masing-masing maks 5 MB, JPEG, PNG, atau WebP. Jenis file dicek dari isi file, bukan nama atau `Content-Type` |

Field lain ditolak `400 VALIDATION_ERROR`. Frontend membaca public site key Turnstile dari `VITE_TURNSTILE_SITE_KEY`.

Urutan pengecekan server: Board ada dan tidak beku, kategori milik Board, cek ban (Fase 7), batas laporan, captcha, lalu foto (jenis, pemrosesan, scan NSFW). Laporan dan foto baru disimpan setelah semua lolos.

Cookie tamu: setiap pengirim mendapat cookie `tindak.gt` (httpOnly, 1 tahun). Server hanya menyimpan hash-nya untuk menghitung batas per perangkat. IP disimpan sebagai HMAC-SHA256 (`IP_HASH_SECRET`), tidak pernah sebagai IP asli.

Batas laporan (dihitung dari tabel laporan, tetap berlaku setelah server restart, jendela 24 jam bergulir):

| Pengirim           | Batas                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Tamu               | 3 per 24 jam per perangkat (cookie `tindak.gt`), jeda 2 menit antar laporan |
| User login         | 5 per 24 jam per akun, jeda 1 menit                                         |
| Satu jaringan (IP) | 30 per 24 jam, tamu dan user digabung                                       |

Ditambah rate limit 10 percobaan kirim per menit per IP.

Sukses `201`:

```json
{
  "data": {
    "report": "<Report detail>",
    "trackingCode": "K7M2P9QX",
    "trackingUrl": "http://localhost:5173/lacak/K7M2P9QX?secret=<rahasia-sekali-kirim>"
  }
}
```

`trackingCode` 8 karakter dari `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (tanpa 0, O, 1, I, L). `trackingUrl` memakai `CLIENT_URL` dan berisi secret yang hanya dikirim sekali. Server hanya menyimpan hash secret.

Error:

| Status | Code                  | Kapan                                                                                                                                                                              |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Field tidak valid, field asing, foto kosong, lebih dari 4, di atas 5 MB, bukan gambar, atau rusak (`details.field` = `photos`), captcha gagal (`details.field` = `turnstileToken`) |
| 403    | `ACCOUNT_BANNED`      | Akun, perangkat, atau IP pengirim sedang di-ban (lihat Fase 7)                                                                                                                     |
| 404    | `BOARD_NOT_FOUND`     | Board tidak ada atau `FROZEN`                                                                                                                                                      |
| 404    | `CATEGORY_NOT_FOUND`  | Kategori bukan milik Board ini                                                                                                                                                     |
| 422    | `IMAGE_REJECTED`      | Foto terdeteksi tidak pantas (skor NSFW di atas 0,7)                                                                                                                               |
| 429    | `RATE_LIMITED`        | Batas atau jeda tercapai. `message` menyebut kapan bisa lapor lagi, `details` berisi `{ "field": "retryAt", "message": "<ISO date>" }`                                             |
| 503    | `SERVICE_UNAVAILABLE` | Server Cloudflare Turnstile tidak dapat dihubungi                                                                                                                                  |

### GET /api/boards/:slug/reports

Auth: publik.

| Query                              | Aturan                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `sort`                             | `new` (default), `hot`, `priority`, atau `resolved`. Lihat Urutan feed di Fase 6                  |
| `status`, `severity`, `categoryId` | opsional, filter                                                                                  |
| `q`                                | opsional, 2 sampai 100 karakter, mencari di judul (dipakai pemilih laporan induk duplikat Fase 5) |
| `page`, `pageSize`                 | default 1 dan 10, `pageSize` maks 50                                                              |

Urutan sesuai `sort` (lihat Fase 6). Laporan tersembunyi (`isHidden`) tidak pernah masuk daftar.

Sukses `200`: `{ "data": [<Report>], "meta": { "page": 1, "pageSize": 10, "total": 0, "totalPages": 0 } }`.

Error: `400 VALIDATION_ERROR`, `404 BOARD_NOT_FOUND`.

### GET /api/reports/:id

Auth: opsional.

Sukses `200`: `{ "data": <Report detail> }`.

Laporan tersembunyi hanya terlihat utuh oleh Penindak aktif Board itu, Admin, dan pelapornya sendiri (akun). Orang lain mendapat data ringkas (lihat Fase 7). Laporan di Board `FROZEN` hanya terlihat oleh Penindak, Admin, dan Admin Board.

Error: `404 REPORT_NOT_FOUND`.

### GET /api/track/:code?secret=...

Auth: publik dengan secret. Kode boleh ditulis huruf kecil, dengan spasi, atau berawalan `TND-`. Rate limit 60 per 15 menit per IP.

Sukses `200`: `{ "data": <Report detail> }`.

Error: `400 VALIDATION_ERROR` jika `secret` tidak dikirim atau format kode salah. `404 REPORT_NOT_FOUND` jika kode tidak ada atau secret salah (respons sama persis untuk keduanya).

### GET /api/me/reports

Auth: Login. Laporan yang dibuat user ini, termasuk yang anonim dan yang tersembunyi, terbaru dulu. Query `page` dan `pageSize`.

Sukses `200`: `{ "data": [<Report>], "meta": { "page": 1, "pageSize": 10, "total": 0, "totalPages": 0 } }`.

Error: `401 UNAUTHENTICATED`.

### Perubahan pada Board

- `activeReportCount` di BoardCard dan detail sekarang jumlah laporan berstatus aktif yang tidak tersembunyi. Urutan pencarian Board memakainya.
- `DELETE /api/boards/:slug/categories/:id` menolak kategori yang sudah dipakai laporan dengan `409 CATEGORY_IN_USE`. Kategori tetap bisa diganti namanya.

---

## Fase 5: Penindakan dan Status

Fase ini melengkapi data detail dan pelacakan laporan Fase 4. Frontend menggunakan timeline dan allowedActions dari server agar tidak menebak hak akses atau transisi status.

### Status, aksi, dan objek laporan

Status: NEW, NEED_INFO, IN_PROGRESS, AWAITING_CONFIRMATION, RESOLVED, REOPENED, REJECTED, DUPLICATE.

Transisi sah:

- NEW → IN_PROGRESS, NEED_INFO, REJECTED, DUPLICATE
- NEED_INFO → NEW, REJECTED
- IN_PROGRESS → AWAITING_CONFIRMATION, REJECTED, DUPLICATE
- AWAITING_CONFIRMATION → RESOLVED, REOPENED
- REOPENED → IN_PROGRESS, AWAITING_CONFIRMATION

Transisi lain menghasilkan 409 INVALID_TRANSITION. Tabel transisi ada di `shared` (`REPORT_TRANSITIONS`, `canTransition(from, to)`), sehingga frontend memakai aturan yang sama dengan server.

Nilai allowedActions: PROCESS, REQUEST_INFO, ANSWER_INFO, REJECT, DUPLICATE, RESOLVE, CONFIRM. Server menghitungnya dengan `reportAllowedActions` dari `shared`:

- Penindak aktif Board (OWNER atau HANDLER): aksi yang transisinya sah dari status sekarang, berurutan PROCESS, REQUEST_INFO, RESOLVE, REJECT, DUPLICATE.
- Pelapor (akun pembuat laporan di `GET /api/reports/:id`, atau pemegang Kode Lacak di `GET /api/track/:code`): ANSWER_INFO jika status NEED_INFO dan pertanyaan terakhir belum dijawab, CONFIRM jika status AWAITING_CONFIRMATION.
- Pengunjung lain: `[]`.

Setiap perubahan status memakai update bersyarat ("hanya jika status masih sama"). Jika dua Penindak bertindak bersamaan, yang kalah mendapat 409 INVALID_TRANSITION.

Detail laporan menambahkan dueAt, isOverdue, reporterNotSatisfied, reopenCount, parent, infoRequest, timeline, dan allowedActions. dueAt hanya diisi untuk severity DANGEROUS. isOverdue benar jika dueAt sudah lewat dan laporan belum menunggu konfirmasi atau selesai. Foto memakai kind BEFORE, AFTER, atau EXTRA.

Setiap timeline berisi id, fromStatus, toStatus, actorType (HANDLER, REPORTER, SYSTEM), actor ({ id, name } atau null), reason (alasan penolakan atau null), note atau null, dan createdAt. Entri pertama setiap laporan adalah `null → NEW` oleh REPORTER dengan note "Laporan dibuat". actor bernilai null untuk SYSTEM dan untuk pelapor anonim atau tamu. Catatan yang ditulis server: REQUEST_INFO memakai pertanyaannya, jawaban info "Pelapor menjawab pertanyaan Penindak", duplikat "Duplikat dari laporan #<id>", konfirmasi otomatis "Dikonfirmasi otomatis", dan batas buka ulang "Pelapor tidak puas: <catatan>".

infoRequest adalah pertanyaan terakhir: id, question, answer atau null, askedBy ({ id, name } atau null), createdAt, dan answeredAt atau null. Detail dan item antrean juga berisi assignee ({ id, name, avatarUrl } atau null).

Alasan penolakan: NOT_PHYSICAL, OUT_OF_SCOPE, INSUFFICIENT_INFORMATION, FALSE_REPORT, OTHER. Note wajib jika reason OTHER.

### Pembacaan laporan (dependensi Fase 4)

Objek laporan memuat id, board, category, title, description, locationDetail, severity, status, isAnonymous, media, createdAt, dan updatedAt. Item media memuat id, url, kind (BEFORE, AFTER, EXTRA), isBlurred, dan createdAt.

#### GET /api/boards/:slug/reports

Auth: publik. Query: sort (new, hot, priority), status, categoryId, severity, page, pageSize, dan q opsional untuk mencari judul laporan di Board tersebut. Parameter q dipakai pemilih laporan induk duplikat Fase 5.

Sukses 200: respons paginasi umum berisi daftar laporan Board. Laporan tersembunyi tidak tampil.

#### GET /api/reports/:id

Auth: optional. Detail memuat media, timeline, infoRequest, isOverdue, allowedActions, parent, dueAt, reopenCount, dan reporterNotSatisfied. Nama pelapor anonim ditampilkan sebagai Anonim.

Sukses 200: { "data": <Report detail> }.

Error: 404 REPORT_NOT_FOUND.

#### GET /api/track/:code?secret=...

Auth: publik dengan secret. Mengembalikan detail laporan yang sama untuk tamu pemegang tautan lacak. Secret salah atau kode tidak dikenal menghasilkan respons yang sama.

Sukses 200: { "data": <Report detail> }.

Error: 404 REPORT_NOT_FOUND.

### GET /api/boards/:slug/queue

Auth: login sebagai Penindak Utama atau Penindak aktif pada Board. Query opsional: status, categoryId, severity, assigneeId, overdue (true/false), page, pageSize (default 20, maks 50). Query `sort`: `priority` (default), `hot`, atau `new` (lihat Fase 6). Laporan tersembunyi tidak ikut sampai antrean moderasi Fase 7. overdue=false berarti semua laporan yang tidak terlambat.

Sukses 200: respons paginasi umum, item berisi data laporan, kategori, media pertama, assignee, isOverdue, dan allowedActions.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 BOARD_NOT_FOUND.

### POST /api/reports/:id/process

Auth: Penindak Utama atau Penindak aktif Board laporan. Memindahkan NEW atau REOPENED ke IN_PROGRESS. Body opsional: { "assigneeId": 18 }; assigneeId harus anggota aktif Board yang sama (OWNER atau HANDLER). Tanpa assigneeId, penanggung jawab lama dipertahankan (laporan baru tetap tanpa penanggung jawab). assigneeId null mengosongkan penanggung jawab.

Sukses 200: { "data": <Report detail> }.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 REPORT_NOT_FOUND, 404 HANDLER_NOT_FOUND, 409 INVALID_TRANSITION.

### POST /api/reports/:id/request-info

Auth: Penindak Utama atau Penindak aktif Board laporan. Memindahkan NEW ke NEED_INFO. Body: { "question": "Bisa jelaskan patokan lokasi yang lebih dekat?" }. Pertanyaan 1-1000 karakter.

Sukses 200: { "data": <Report detail> }.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 REPORT_NOT_FOUND, 409 INVALID_TRANSITION.

### POST /api/reports/:id/answer-info

Auth: pelapor login atau tamu dengan Kode Lacak dan secret yang benar. Jawaban hanya dapat dikirim sekali dan mengembalikan status NEED_INFO ke NEW. Body: { "answer": "Di depan nomor 12." }. Tamu menyertakan trackingCode dan secret dalam body.

Sukses 200: { "data": <Report detail> }.

Kode Lacak boleh ditulis dengan awalan TND- atau huruf kecil. trackingCode dan secret harus dikirim bersama. Rate limit 30 per 15 menit per IP.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED (tanpa login dan tanpa Kode Lacak), 403 FORBIDDEN (login sebagai user yang bukan pelapor), 404 REPORT_NOT_FOUND (termasuk Kode Lacak atau secret salah), 409 INFO_ALREADY_ANSWERED, 409 INVALID_TRANSITION.

### POST /api/reports/:id/reject

Auth: Penindak Utama atau Penindak aktif Board laporan. Body: { "reason": "OTHER", "note": "Lokasi berada di luar wilayah Board." }. Mengubah status menjadi REJECTED.

Sukses 200: { "data": <Report detail> }.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 REPORT_NOT_FOUND, 409 INVALID_TRANSITION.

### POST /api/reports/:id/duplicate

Auth: Penindak Utama atau Penindak aktif Board laporan. parentId harus laporan lain di Board yang sama, berstatus aktif (NEW, NEED_INFO, IN_PROGRESS, AWAITING_CONFIRMATION, REOPENED), tidak tersembunyi, dan bukan duplikat laporan lain. Semua pelanggaran, termasuk ID yang tidak ada, membalas 409 INVALID_DUPLICATE.

Body: { "parentId": 42 }.

Sukses 200: { "data": <Report detail> }.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 REPORT_NOT_FOUND, 409 INVALID_DUPLICATE, 409 INVALID_TRANSITION.

### POST /api/reports/:id/resolve

Auth: Penindak Utama atau Penindak aktif Board laporan. multipart/form-data dengan note wajib dan satu sampai empat file photos sebagai bukti AFTER. Tipe dan batas file mengikuti aturan upload laporan Fase 4.

Sukses 200: { "data": <Report detail> } dengan status AWAITING_CONFIRMATION.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 REPORT_NOT_FOUND, 409 INVALID_TRANSITION, 422 IMAGE_REJECTED.

### POST /api/reports/:id/confirm

Auth: pelapor login atau tamu dengan Kode Lacak dan secret yang benar. result bernilai resolved atau not_resolved; note wajib jika belum selesai. Tamu menyertakan trackingCode dan secret dalam body.

Body JSON: { "result": "not_resolved", "note": "Saluran masih tersumbat.", "trackingCode": "K7M2P9QX", "secret": "<rahasia>" }. Untuk foto opsional gunakan multipart/form-data dan file photos (kind EXTRA).

- resolved mengubah status menjadi RESOLVED.
- not_resolved mengubah status menjadi REOPENED dan menambah reopenCount, maksimal dua kali. not_resolved ketiga langsung mengubah status menjadi RESOLVED dengan reporterNotSatisfied true. Karena itu 409 REOPEN_LIMIT_REACHED tidak pernah dikirim server; kodenya tetap ada di shared.
- Foto (kind EXTRA) hanya boleh dikirim bersama not_resolved, maksimal 4. Foto dengan resolved membalas 400.
- Aturan login, Kode Lacak, rate limit, 401, 403, dan 404 sama seperti answer-info.

Sukses 200: { "data": <Report detail> }.

Error: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 404 REPORT_NOT_FOUND, 409 INVALID_TRANSITION, 409 REOPEN_LIMIT_REACHED, 422 IMAGE_REJECTED.

### Aktivitas dan otomatisasi

Setiap aksi Penindak (termasuk mengubah pengaturan, kategori, dan anggota Board) memperbarui aktivitas terakhir Board, dan Board INACTIVE langsung kembali ACTIVE. Aksi pelapor tidak dihitung.

Job terjadwal berjalan setiap jam di menit ke-7 (node-cron), bisa dimatikan dengan env JOBS_ENABLED=false:

- Laporan AWAITING_CONFIRMATION yang sudah lebih dari tiga hari sejak masuk status itu berubah menjadi RESOLVED oleh SYSTEM dengan catatan "Dikonfirmasi otomatis".
- Board ACTIVE tanpa aktivitas Penindak selama 30 hari menjadi INACTIVE.

isOverdue dihitung saat respons dibuat: severity DANGEROUS, dueAt sudah lewat, dan status belum AWAITING_CONFIRMATION, RESOLVED, REJECTED, atau DUPLICATE.

---

## Fase 6: Dukungan, Reaksi, Prioritas, Beranda

### Field tambahan di objek Report

Semua objek `Report` dan `Report detail` (feed Board, beranda, laporan saya, antrean, detail, lacak) sekarang berisi:

```json
{
  "supportCount": 4,
  "reactionCounts": { "DANGEROUS": 2, "LONG_STANDING": 1, "ANNOYING": 0 },
  "priorityScore": 42,
  "isEngagementLocked": false,
  "resolvedAt": null,
  "mySupport": false,
  "myReaction": null,
  "isOwnReport": false
}
```

- `supportCount` sudah termasuk 1 dukungan otomatis dari pelapor.
- `isEngagementLocked` bernilai `true` untuk `RESOLVED`, `REJECTED`, dan `DUPLICATE`.
- `mySupport`, `myReaction`, dan `isOwnReport` diisi untuk user login. Untuk tamu: `false`, `null`, `false`.
- `board` di setiap laporan berisi `verification`. Di detail laporan, `board.owner` (`{ id, name, avatarUrl }`) juga dikirim, dipakai sebagai pilihan penanggung jawab.

### Rumus skor

- `priorityScore` = dukungan + 🚨 × 3 + ⏳ × 2 + 😤 + bobot bahaya (Rendah 0, Sedang 10, Berbahaya 30) + hari belum selesai × 2. Rumus ada di `shared/src/reportScore.js` (`priorityScore`, `daysOpen`). Dihitung ulang saat ada dukungan atau reaksi, saat status berubah, dan oleh job harian (00.20) untuk faktor hari. Laporan yang sudah ditutup berhenti menghitung hari.
- `hotScore` = jumlah dukungan baru + reaksi baru atau diganti dalam 48 jam terakhir. Disimpan sebagai kolom cache, diperbarui langsung saat ada dukungan atau reaksi, dan dikoreksi job tiap 15 menit supaya aktivitas yang lewat 48 jam turun.

### PUT /api/reports/:id/support

Auth: Login. Mendukung laporan. Idempoten. Penindak Board boleh mendukung.

Sukses `200`:

```json
{
  "data": {
    "reportId": 7,
    "supportCount": 5,
    "reactionCounts": { "DANGEROUS": 2, "LONG_STANDING": 1, "ANNOYING": 0 },
    "priorityScore": 43,
    "mySupport": true,
    "myReaction": null
  }
}
```

Error: `401 UNAUTHENTICATED`, `403 FORBIDDEN` (pelapor mendukung laporannya sendiri), `404 REPORT_NOT_FOUND` (termasuk laporan tersembunyi dan Board `FROZEN`), `409 REPORT_LOCKED`, `429 RATE_LIMITED` (60 per menit).

### DELETE /api/reports/:id/support

Auth: Login. Menarik dukungan. Idempoten. Sukses `200` dengan bentuk yang sama. Error sama, tanpa 403.

### PUT /api/reports/:id/reaction

Auth: Login. Body: `{ "type": "DANGEROUS" }` (`DANGEROUS`, `LONG_STANDING`, `ANNOYING`). Membuat atau mengganti reaksi; satu reaksi per user per laporan. Pelapor boleh bereaksi pada laporannya sendiri. Field lain ditolak 400.

Sukses `200`: bentuk sama seperti dukungan.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 REPORT_NOT_FOUND`, `409 REPORT_LOCKED`, `429 RATE_LIMITED`.

### DELETE /api/reports/:id/reaction

Auth: Login. Menghapus reaksi. Idempoten. Sukses `200` dengan bentuk yang sama.

### Urutan feed

`GET /api/boards/:slug/reports?sort=`:

| sort       | Urutan                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| `new`      | terbaru dulu (default)                                                     |
| `hot`      | `hotScore` tertinggi, lalu terbaru                                         |
| `priority` | `priorityScore` tertinggi, lalu terbaru                                    |
| `resolved` | hanya status `RESOLVED`, yang paling baru diselesaikan (`resolvedAt`) dulu |

`GET /api/boards/:slug/queue` menerima `sort` = `priority` (default), `hot`, atau `new`.

### GET /api/feed/home

Auth: opsional. Query: `tab` (`hot` default, atau `following`), `page`, `pageSize` (default 10, maks 50).

- `hot`: laporan dari semua Board yang tidak beku, urut `hotScore` lalu terbaru.
- `following`: wajib login (`401` untuk tamu). Laporan dari Board yang diikuti, terbaru dulu.

Laporan tersembunyi tidak ikut. Setiap item berisi `board` (`id`, `slug`, `name`, `status`, `verification`).

Sukses `200`: `{ "data": [<Report>], "meta": { "page": 1, "pageSize": 10, "total": 0, "totalPages": 0 } }`.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`.

### GET /api/boards/popular

Auth: opsional. Query: `limit` (default 6, maks 20).

Board yang tidak beku, diurutkan dari pengikut terbanyak, lalu laporan aktif terbanyak, lalu Official, lalu `trustScore` tertinggi, lalu terbaru. Urutan ada di fungsi `comparePopularity` (`server/src/modules/boards/boards.ranking.js`).

Sukses `200`: `{ "data": [<BoardCard>] }`. Setiap item berisi `verification`, `followerCount`, `activeReportCount`, dan `viewer`.

### Perubahan pencarian Board

`GET /api/boards/search` tanpa `q` sekarang diurutkan dengan urutan populer yang sama seperti `GET /api/boards/popular`, sehingga kotak cari bisa langsung menampilkan Board terpopuler sebelum user mengetik. Dengan `q`, urutan tetap seperti Fase 2.

---

## Fase 7: Moderasi dan Panel Admin

Semua endpoint `/api/admin/*` hanya untuk `User.role` `ADMIN`. Tamu mendapat `401 UNAUTHENTICATED`, role lain termasuk `BOARD_ADMIN` mendapat `403 FORBIDDEN`. Admin tidak punya endpoint untuk mengubah `Board.verification`; status Official hanya diberikan Admin Board (Fase 8).

### Alasan Tandai Pelanggaran

Konstanta di `shared/src/constants/moderation.js` (`FLAG_REASON_META`).

| Reason            | Label                             | Target        | Berat |
| ----------------- | --------------------------------- | ------------- | ----- |
| `SEXUAL`          | 🔞 Konten seksual                 | REPORT, BOARD | Berat |
| `VIOLENCE`        | 🩸 Kekerasan                      | REPORT        | Berat |
| `HATE`            | 🗯️ SARA/ujaran kebencian          | REPORT, BOARD | Biasa |
| `PERSONAL_ATTACK` | 👤 Menyerang atau menyebut nama   | REPORT, BOARD | Biasa |
| `SPAM`            | 📢 Spam/iklan                     | REPORT, BOARD | Biasa |
| `NOT_COMPLAINT`   | 🚫 Bukan pengaduan masalah fisik  | REPORT        | Biasa |
| `FAKE_BOARD`      | 🏚️ Board palsu                    | BOARD         | Biasa |
| `SYSTEM_NSFW`     | 🤖 Deteksi otomatis foto (sistem) | REPORT        | -     |

`SYSTEM_NSFW` tidak bisa dikirim user. Server membuatnya (bobot 0) saat laporan disimpan dengan foto yang diburamkan, supaya laporan itu masuk Antrean Moderasi.

### Aturan sembunyi otomatis

Laporan langsung disembunyikan (`isHidden: true`) jika salah satu terpenuhi. Hanya tanda `OPEN` yang dihitung, dan yang dijumlahkan adalah bobotnya.

1. Total bobot alasan berat (`SEXUAL`, `VIOLENCE`) minimal 2. `hiddenReason: FLAGS`.
2. Total bobot alasan lain minimal 3. `hiddenReason: FLAGS`.
3. Satu tanda dari Penindak aktif Board itu (bobot di atas 0). `hiddenReason: HANDLER_FLAG`, `hiddenByHandler: true`.

Bobot tanda 1, atau 0 jika user punya 5 tanda `REJECTED` dalam 30 hari terakhir (penyalahguna). Tanda bobot 0 tetap tersimpan dan terlihat Admin, tetapi tidak ikut dihitung. Board tidak disembunyikan otomatis; tanda Board hanya masuk antrean.

### Objek Report (tambahan)

- `isHidden` (boolean) ikut di objek Report.
- Laporan tersembunyi yang dibuka orang selain Penindak Board itu, Admin, atau pelapornya mendapat `200` dengan data ringkas: `{ "id", "board": { "slug", "name" }, "isHidden": true, "moderationNotice": "Laporan ini sedang ditinjau moderator" }`. Judul, deskripsi, foto, dan lokasi tidak dikirim. Sebelumnya `404`.
- Laporan yang dihapus Admin (`removedAt` terisi) mendapat `404 REPORT_NOT_FOUND` untuk semua orang kecuali Admin, dan tidak muncul di `GET /api/me/reports`.
- Detail Board menambah `restoredByAdminCount`: jumlah laporan yang disembunyikan Penindak Board itu tetapi dipulihkan Admin.

### Ban

| Target        | Nilai yang disimpan        | Durasi                         |
| ------------- | -------------------------- | ------------------------------ |
| `USER`        | id user                    | `1d`, `7d`, `30d`, `permanent` |
| `GUEST_TOKEN` | hash cookie perangkat tamu | `1d`, `7d`, `30d`, `permanent` |
| `IP`          | `ipHash` laporan           | `1d`, `7d` saja                |

Admin tidak pernah melihat hash mentah. Ban perangkat dan IP dibuat dari `reportId`, server mengambil nilainya dari laporan itu. Di respons hash ditampilkan tersamar (`a1b2c3…beef`). Admin tidak bisa di-ban.

Ban aktif (belum dicabut dan belum kedaluwarsa) menolak: login email dan Google, membuat laporan, Dukung dan reaksi, membuat Board, dan Tandai Pelanggaran. Ban `USER` juga menghapus semua session user itu.

Error ban:

```json
{
  "error": {
    "code": "ACCOUNT_BANNED",
    "message": "Kamu sedang diblokir. Blokir berakhir dalam 6 hari 23 jam.",
    "details": [{ "field": "bannedUntil", "message": "2026-10-13T08:00:00.000Z" }]
  }
}
```

Untuk ban permanen `message` berbunyi "Kamu diblokir permanen karena melanggar aturan komunitas." dan `details[0].message` bernilai `permanen`. Login Google yang ditolak karena ban diarahkan ke `/masuk?error=account_banned`.

### POST /api/flags

Auth: login, tidak sedang di-ban. Rate limit 20 per menit, dan maksimal 20 tanda per 24 jam per user.

Body: `{ "targetType": "REPORT", "targetId": 7, "reason": "SPAM", "note": "opsional, maks 500" }`.

Sukses `201`: `{ "data": { "id", "targetType", "targetId", "reason", "status": "OPEN", "hidden": false } }`. `hidden` bernilai `true` jika tanda ini membuat laporan tersembunyi.

| Status | Code                    | Kapan                                                                   |
| ------ | ----------------------- | ----------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`      | Alasan tidak berlaku untuk target (misalnya `FAKE_BOARD` untuk laporan) |
| 401    | `UNAUTHENTICATED`       | Belum login                                                             |
| 403    | `ACCOUNT_BANNED`        | Sedang di-ban                                                           |
| 404    | `FLAG_TARGET_NOT_FOUND` | Laporan atau Board tidak ada, dihapus, atau Board beku                  |
| 409    | `ALREADY_FLAGGED`       | User sudah pernah menandai target ini                                   |
| 429    | `RATE_LIMITED`          | Batas 20 tanda per hari tercapai                                        |

### GET /api/admin/stats

Sukses `200`: `{ "data": { "users": { "total" }, "boards": { "total", "active", "inactive", "frozen", "official" }, "reports": { "total", "active", "resolved", "hidden", "removed" }, "moderation": { "openFlags", "openTargets" }, "bans": { "active" } } }`.

### GET /api/admin/moderation

Query: `status` (default `OPEN`), `reason`, `targetType`, `page`, `pageSize` (default 20, maks 50).

Tanda dikelompokkan per target. Urutan: alasan terberat (`SEXUAL`, `VIOLENCE`, `SYSTEM_NSFW`, `HATE`, `PERSONAL_ATTACK`, `FAKE_BOARD`, `SPAM`, `NOT_COMPLAINT`), lalu jumlah tanda terbanyak, lalu tanda pertama paling lama.

Setiap item: `targetType`, `targetId`, `worstReason`, `reasons`, `flagCount`, `totalWeight`, `firstFlaggedAt`, `flags` (`id`, `reason`, `note`, `weight`, `status`, `createdAt`, `flagger` { id, name } atau null untuk sistem), dan salah satu dari:

- `report`: id, title, description, locationDetail, status, severity, isHidden, hiddenReason, hiddenByHandler, removedAt, createdAt, board { id, slug, name }, media (id, url, kind, isBlurred, nsfwScore), reporterType (`ACCOUNT` atau `GUEST`), reporter { id, name, email } atau null, isAnonymous, ipHashMasked, guestTokenMasked, history { totalReports, removedReports, hiddenReports, bans [{ id, targetType, expiresAt, revokedAt, createdAt, isActive }] }. Riwayat dihitung dari akun, perangkat, dan IP yang sama.
- `board`: id, slug, name, city, status, verification, managerTitle, restoredByAdminCount, owner { id, name, email }.

### POST /api/admin/reports/:id/restore

Body opsional: `{ "note": "..." }`. Membuka sembunyi, mengosongkan `removedAt`, menandai semua tanda `OPEN` menjadi `REJECTED` (menambah hitungan penyalahguna pemberi tanda). Jika laporan disembunyikan Penindak, `restoredByAdminCount` Board bertambah 1. Sukses `200`: objek `report` seperti di antrean.

### POST /api/admin/reports/:id/remove

Body: `{ "note": "opsional", "ban": { "targetType", "duration", "reason" } }`. `ban` opsional (tombol Hapus + Ban). Laporan dihapus lunak: `isHidden: true`, `hiddenReason: ADMIN_REMOVED`, `removedAt` terisi. Tanda `OPEN` menjadi `ACCEPTED`. Sukses `200`: `{ "data": { "report", "ban": <Ban> | null } }`.

### GET /api/admin/bans

Query: `active` (`true` default, `false` untuk semua), `page`, `pageSize`.

Objek Ban: `id`, `targetType`, `target` (nama dan email untuk akun, hash tersamar untuk perangkat dan IP), `reason`, `expiresAt` (null = permanen), `createdAt`, `revokedAt`, `createdBy` { id, name }, `isActive`.

### POST /api/admin/bans

Body: `{ "targetType": "USER" | "GUEST_TOKEN" | "IP", "duration": "1d" | "7d" | "30d" | "permanent", "reason": "min 3", "reportId"?, "userId"? }`. `GUEST_TOKEN` dan `IP` wajib `reportId`. `USER` memakai `userId` atau `reportId` dari laporan akun. Sukses `201`: `<Ban>`.

| Status | Code               | Kapan                                                                           |
| ------ | ------------------ | ------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Ban IP selain 1d/7d, `reportId` tidak ada, atau laporan tidak punya data target |
| 403    | `FORBIDDEN`        | Mencoba mem-ban Admin                                                           |
| 404    | `NOT_FOUND`        | User atau laporan tidak ditemukan                                               |

### DELETE /api/admin/bans/:id

Mencabut ban (`revokedAt` diisi). Sukses `200`: `<Ban>` dengan `isActive: false`.

### GET /api/admin/boards

Query: `q` (nama), `status`, `page`, `pageSize`. Setiap item: id, slug, name, city, type, status, verification, verifiedAt, restoredByAdminCount, owner, reportCount, openFlagCount, fakeBoardFlagCount, createdAt.

### POST /api/admin/boards/:slug/freeze

Body: `{ "reason": "min 3" }`. Field lain ditolak. Board menjadi `FROZEN`, tanda Board `OPEN` menjadi `ACCEPTED`. Jika Board `OFFICIAL`, dalam transaksi yang sama `verification` menjadi `COMMUNITY` dan `verifiedAt`, `verifiedById` dikosongkan, lalu tercatat audit `BOARD_VERIFICATION_REVOKED_BY_FREEZE` (berisi tanggal dan pemberi verifikasi sebelumnya). Sukses `200`: `{ "data": { "slug", "status": "FROZEN", "verification": "COMMUNITY", "verificationRevoked": true } }`. `409 CONFLICT` jika sudah beku.

### POST /api/admin/boards/:slug/unfreeze

Board kembali `ACTIVE`. Status Official tidak dikembalikan; harus diajukan ulang ke Admin Board. Sukses `200`: `{ "data": { "slug", "status": "ACTIVE", "verification" } }`. `409 CONFLICT` jika tidak sedang beku.

### POST /api/admin/boards/:slug/dismiss-flags

Body opsional `{ "note" }`. Semua tanda Board `OPEN` menjadi `REJECTED`. Sukses `200`: `{ "data": { "slug", "dismissed": true } }`.

### GET /api/admin/users

Query: `q` (nama atau email), `page`, `pageSize`. Setiap item: id, name, email, role, createdAt, lastLoginAt, reportCount, flagCount, activeBan { id, expiresAt } atau null.

### GET /api/admin/audit-logs

Query: `action`, `actorUserId`, `targetType` (`REPORT`, `BOARD`, `BAN`, `USER`), `page`, `pageSize`. Setiap item: id, action, actor { id, name } atau null (sistem), targetType, targetId, data, createdAt. Terbaru lebih dulu.

Aksi yang dicatat: `REPORT_AUTO_HIDDEN`, `REPORT_RESTORED`, `REPORT_REMOVED`, `BAN_CREATED`, `BAN_REVOKED`, `BOARD_FROZEN`, `BOARD_UNFROZEN`, `BOARD_VERIFICATION_REVOKED_BY_FREEZE`, `BOARD_FLAGS_DISMISSED`, aksi Penindak (`REPORT_PROCESSED`, `REPORT_INFO_REQUESTED`, `REPORT_REJECTED`, `REPORT_MARKED_DUPLICATE`, `REPORT_MARKED_RESOLVED`), `REPORT_CONFIRMED_BY_REPORTER`, `REPORT_AUTO_CONFIRMED`, dan aksi anggota Board (`BOARD_HANDLER_INVITED`, `BOARD_INVITATION_ACCEPTED`, `BOARD_INVITATION_DECLINED`, `BOARD_INVITATION_CANCELLED`, `BOARD_HANDLER_REMOVED`, `BOARD_OWNER_CHANGED`).

### Job harian

Job harian (Fase 5) sekarang juga mengosongkan `Report.ipHash` yang lebih tua dari 90 hari, kecuali hash yang sedang dipakai ban IP aktif.

---

## Fase 8: Rating, Kepercayaan, dan Verifikasi Official

Angka syarat ada di `shared/src/constants/verification.js` (`VERIFICATION_RULES`, `TRUST_RULES`) supaya mudah diubah tim. Rumus murni ada di `server/src/modules/trust/trustScore.js`.

### Rumus Skor Kepercayaan

```
Rating Tertimbang = (5 × 3 + total bintang) ÷ (5 + jumlah rating)
Tingkat Tanggap   = laporan yang keluar dari status NEW dalam 7 hari sejak dibuat
                    ÷ laporan yang sudah berumur lebih dari 7 hari atau sudah disentuh
Skor              = 0,6 × Rating Tertimbang + 0,4 × Tingkat Tanggap × 5
```

- Laporan yang dihapus Admin tidak dihitung. Jika belum ada laporan yang bisa dihitung, Tingkat Tanggap `null` dan Skor sama dengan Rating Tertimbang (Board baru tanpa rating: 3,0).
- Persentase ditolak = laporan `REJECTED` ÷ semua laporan (yang tidak dihapus).
- Label (`trustLabel`): kurang dari 5 rating `NEW`; skor (dibulatkan 1 desimal) 4,0 ke atas `TRUSTED`; 2,5 sampai 3,9 `NONE`; di bawah 2,5 `CAUTION`. Board berstatus `INACTIVE` selalu berlabel `INACTIVE`.
- Contoh 1: 40 rating, total 180 bintang, tanggap 90%. Rating Tertimbang (15 + 180) ÷ 45 = 4,33. Skor 0,6 × 4,33 + 0,4 × 0,9 × 5 = **4,4** (`TRUSTED`).
- Contoh 2: 10 rating, total 20 bintang, tanggap 45%. Rating Tertimbang 35 ÷ 15 = 2,33. Skor 1,4 + 0,9 = **2,3** (`CAUTION`).
- Dihitung ulang saat rating berubah, laporan dibuat, status laporan berubah, laporan dipulihkan atau dihapus Admin, Board dibekukan atau dicairkan, tanda Board Palsu dibuat atau diabaikan, dan lewat job harian.
- Skor dan label dihitung otomatis dan **tidak pernah** mengubah `verification`. Official hanya diberikan Admin Board.

### Perubahan BoardCard dan detail Board

- `trustScore` sekarang angka 1 desimal (contoh `4.4`), `null` hanya untuk data lama yang belum dihitung. `trustLabel` sesuai aturan di atas. BoardCard menambah `ratingCount`.
- Detail Board: `ratingCount`, `averageStars` (1 desimal atau `null`), `responseRate` (persen bulat 0 sampai 100, atau `null` jika belum ada data), `rejectedPercentage` (persen bulat).
- Detail Board menambah `verificationHistory`: `[{ id, action, reason, createdAt }]`, terbaru dulu. Publik hanya melihat `GRANTED` tanpa alasan. Penindak Utama melihat `GRANTED` dan `REVOKED` beserta alasan. Admin Board melihat semua termasuk `SKIPPED`.

### Urutan pencarian final

Dengan `q`: kecocokan nama → `OFFICIAL` di atas → `trustScore` tertinggi (`null` paling bawah) → `activeReportCount` terbanyak → aktivitas Penindak terbaru → terbaru dibuat. Tanpa `q` dan `GET /api/boards/popular`: pengikut → laporan aktif → Official → `trustScore` → terbaru.

### PUT /api/boards/:slug/rating

Auth: login, tidak sedang di-ban. Rate limit 20 per menit.

Syarat: mengikuti Board, bukan Penindak (OWNER atau HANDLER) Board itu, Board tidak beku. Satu rating per user per Board. Rating boleh diubah kapan saja; mengubah tidak menambah jumlah rating. Jika user berhenti mengikuti, rating lama tetap dihitung.

Body: `{ "stars": 1-5, "quickTag": "RESPONSIVE" | "SLOW" | "DOUBTFUL" | null }`.

Sukses `200`: `{ "data": { "rating": { "stars", "quickTag", "createdAt", "updatedAt" }, "board": { "slug", "trustScore", "trustLabel", "ratingCount", "averageStars", "responseRate", "rejectedPercentage" } } }`.

| Status | Code                 | Kapan                                                                     |
| ------ | -------------------- | ------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`   | Bintang di luar 1 sampai 5 atau pilihan cepat tidak dikenal               |
| 401    | `UNAUTHENTICATED`    | Belum login                                                               |
| 403    | `ACCOUNT_BANNED`     | Sedang di-ban                                                             |
| 403    | `RATING_NOT_ALLOWED` | Belum mengikuti Board atau Penindak Board itu; `message` berisi alasannya |
| 404    | `BOARD_NOT_FOUND`    | Board tidak ada atau beku                                                 |

### GET /api/boards/:slug/rating/me

Auth: opsional. Sukses `200`: `{ "data": { "rating": <rating> | null, "canRate": false, "reasonCode": "NOT_FOLLOWING", "reason": "Ikuti Board ini dulu untuk memberi rating" } }`. `reasonCode`: `LOGIN_REQUIRED`, `BOARD_STAFF`, `NOT_FOLLOWING`, `BANNED`, `BOARD_FROZEN`, atau `null` jika boleh.

### GET /api/boards/:slug/ratings/summary

Auth: publik. Sukses `200`: field kepercayaan seperti di respons rating, ditambah `distribution` (`{ "1": 0, ..., "5": 16 }`) dan `quickTags` (`{ "RESPONSIVE": 5, "SLOW": 0, "DOUBTFUL": 0 }`).

### Antrean Kandidat Official

Board menjadi kandidat jika semua terpenuhi: `COMMUNITY`, minimal 20 rating, skor minimal 4,0, umur minimal 30 hari, status `ACTIVE`, tidak ada tanda `FAKE_BOARD` berstatus `OPEN`, dan tidak dilewati dalam 30 hari terakhir. `Board.candidateSince` diisi saat Board pertama kali memenuhi syarat dan dikosongkan saat tidak lagi memenuhi. Saat berubah dari kosong ke terisi, semua Admin Board menerima notifikasi `BOARD_CANDIDATE_NEW` (Fase 9).

### Endpoint Admin Board

Semua `/api/board-admin/*` hanya untuk `User.role` `BOARD_ADMIN`. Tamu `401`, role lain termasuk `ADMIN` `403 FORBIDDEN`. Aksi verify, skip, dan revoke dicatat di `BoardVerificationLog` (dengan snapshot `ratingCount`, `trustScore`, `responseRate`, `rejectedRate` saat keputusan) dan di `AuditLog` (`BOARD_VERIFIED`, `BOARD_VERIFICATION_SKIPPED`, `BOARD_VERIFICATION_REVOKED`).

- `GET /api/board-admin/stats`: `{ "candidates", "official", "revokedLast30Days", "needsReview" }`.
- `GET /api/board-admin/candidates?page=&pageSize=`: urut `ratingCount` terbanyak, lalu `trustScore`. Item: id, slug, name, city, type, status, verification, verifiedAt, candidateSince, ageDays, dan field kepercayaan.
- `GET /api/board-admin/official?q=&review=&page=`: Board `OFFICIAL`, terbaru diverifikasi dulu, ditambah `verifiedBy` { id, name } dan `needsReview`. `review=true` hanya menampilkan Perlu Ditinjau Ulang (skor di bawah 2,5 atau status `INACTIVE`).
- `GET /api/board-admin/boards/:slug`: detail verifikasi. Field baris di atas ditambah description, managerTitle, createdAt, owner { id, name, email }, verifiedBy, followerCount, restoredByAdminCount, needsReview, distribution, quickTags, reports { total, resolved, rejected }, flags (`{ "<reason>": { "open", "total" } }` untuk tanda Board), checklist (`[{ key, label, passed, value }]` untuk 7 syarat), isCandidateEligible, dan history (`[{ id, action, actor, reason, snapshot, createdAt }]`). Board beku tetap bisa dibuka.
- `POST /api/board-admin/boards/:slug/verify` body `{ "note": "min 5" }` (catatan wajib sesuai PRODUCT.md). Hanya Board `COMMUNITY` yang tidak beku; Board yang belum memenuhi syarat tetap boleh, tetapi respons berisi `warnings` (label syarat yang belum terpenuhi). Sukses `200`: `{ "data": { "slug", "verification": "OFFICIAL", "verifiedAt", "warnings": [] } }`. `409 CONFLICT` jika sudah Official atau beku.
- `POST /api/board-admin/boards/:slug/skip` body `{ "note"? }`. Board keluar dari antrean selama 30 hari. Sukses `200`: `{ "data": { "slug", "skippedUntil" } }`. `409` jika bukan Komunitas.
- `POST /api/board-admin/boards/:slug/revoke` body `{ "reason": "min 10" }`. Board kembali `COMMUNITY`, `verifiedAt` dan `verifiedById` dikosongkan. Sukses `200`: `{ "data": { "slug", "verification": "COMMUNITY" } }`. `409` jika bukan Official.

Pembekuan Board Official oleh Admin (Fase 7) sekarang juga menulis `BoardVerificationLog` `REVOKED` dengan actor sistem (`null`) dan alasan "Board dibekukan moderator".

---

## Fase 9: Notifikasi dan Realtime

### Objek Notification

```json
{
  "id": 12,
  "type": "REPORT_STATUS_CHANGED",
  "data": {
    "reportId": 7,
    "reportTitle": "Lubang besar",
    "boardSlug": "jalan-rungkut-madya-surabaya",
    "boardName": "Jalan Rungkut Madya",
    "status": "IN_PROGRESS",
    "statusLabel": "Diproses"
  },
  "isRead": false,
  "readAt": null,
  "createdAt": "2026-10-06T10:00:00.000Z"
}
```

`data` berbeda per jenis. Teks yang ditampilkan dibuat frontend dari `type` dan `data`. Tujuan klik ada di `notificationLink()` (`shared/src/constants/notifications.js`).

| Type                         | Penerima                                                         | Isi `data` tambahan                       |
| ---------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| `REPORT_STATUS_CHANGED`      | Pelapor (akun)                                                   | `status`, `statusLabel`                   |
| `REPORT_INFO_REQUESTED`      | Pelapor                                                          | `question`                                |
| `REPORT_MARKED_DUPLICATE`    | Pelapor                                                          | `parentId`                                |
| `REPORT_HIDDEN`              | Pelapor                                                          | -                                         |
| `REPORT_REMOVED`             | Pelapor                                                          | -                                         |
| `REPORT_SUPPORT_MILESTONE`   | Pelapor, sekali per milestone 10, 25, 50                         | `milestone`                               |
| `SUPPORTED_REPORT_RESOLVED`  | Pendukung saat laporan menjadi `RESOLVED`                        | -                                         |
| `BOARD_NEW_REPORT`           | Pengikut Board sesuai `notifyLevel` (bukan Penindak)             | `severity`                                |
| `HANDLER_NEW_REPORT`         | Penindak aktif                                                   | `severity`                                |
| `HANDLER_DANGEROUS_REPORT`   | Penindak aktif, untuk laporan Berbahaya                          | `severity`                                |
| `HANDLER_DEADLINE_SOON`      | Penindak aktif, sekali, 6 jam sebelum `dueAt` laporan Berbahaya  | `hours`                                   |
| `HANDLER_REPORT_REOPENED`    | Penindak aktif                                                   | -                                         |
| `HANDLER_INFO_ANSWERED`      | Penindak aktif                                                   | -                                         |
| `BOARD_INVITATION`           | User yang diundang menjadi Penindak                              | `invitationId`                            |
| `BOARD_RATING_DIGEST`        | Penindak aktif, harian jika ada rating baru atau diubah          | `newRatings`, `ratingCount`, `trustScore` |
| `BOARD_VERIFIED`             | Penindak Utama                                                   | -                                         |
| `BOARD_VERIFICATION_REVOKED` | Penindak Utama (termasuk karena Board dibekukan)                 | `reason`                                  |
| `BOARD_CANDIDATE_NEW`        | Semua Admin Board                                                | `ratingCount`                             |
| `BOARD_OWNER_CHANGED`        | Semua Admin Board, hanya untuk Board Official                    | `previousOwnerId`, `newOwnerId`           |
| `BOARD_NEEDS_REVIEW`         | Semua Admin Board saat Board Official masuk Perlu Ditinjau Ulang | `status`                                  |

Semua jenis berisi `boardSlug` dan `boardName`; jenis laporan juga berisi `reportId` dan `reportTitle`. Pelaku aksi tidak pernah menerima notifikasi untuk aksinya sendiri, dan satu orang menerima paling banyak satu notifikasi per kejadian (Penindak yang juga mengikuti Board hanya mendapat versi Penindak). Tamu tidak mendapat notifikasi; halaman Lacak tetap diperbarui realtime.

### GET /api/notifications

Auth: login. Query: `page` (default 1), `pageSize` (default 20, maks 50), `unread` (`true` untuk yang belum dibaca saja). Terbaru dulu. Sukses `200`: `{ "data": [<Notification>], "meta": { "page", "pageSize", "total", "totalPages" } }`.

### GET /api/notifications/unread-count

Auth: login. Sukses `200`: `{ "data": { "count": 3 } }`.

### POST /api/notifications/:id/read

Auth: login. Sukses `200`: `<Notification>` dengan `isRead: true`. Notifikasi milik user lain atau tidak ada: `404 NOT_FOUND`.

### POST /api/notifications/read-all

Auth: login. Sukses `200`: `{ "data": { "updated": 2 } }`.

### Realtime (Socket.IO)

Socket.IO berjalan di server dan alamat yang sama, path `/socket.io`. Koneksi memakai cookie session yang sama dengan login; tamu tetap bisa tersambung. Koneksi dari origin selain `CLIENT_URL` ditolak.

Room:

- `user:<id>`: otomatis untuk user yang login.
- `board:<slug>`: klien mengirim `board:subscribe` dengan slug. Ditolak untuk Board beku kecuali Admin dan Admin Board.
- `report:<id>`: klien mengirim `report:subscribe` dengan `{ id, trackingCode?, secret? }`. Laporan yang terlihat publik boleh untuk siapa saja. Laporan tersembunyi hanya untuk Penindak Board itu, Admin, pelapor, atau yang membawa Kode Lacak dan secret yang benar. Laporan yang dihapus hanya untuk Admin.

Kedua event subscribe menerima callback `{ ok: true | false }`. `board:unsubscribe` dan `report:unsubscribe` keluar dari room.

Event dari server (dipancarkan setelah transaksi database berhasil):

| Event              | Tujuan                                                   | Payload                                                             |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `notification:new` | `user:<id>` penerima                                     | `<Notification>`                                                    |
| `report:updated`   | `report:<id>`, dan `board:<slug>` jika tidak tersembunyi | `{ id, boardSlug, status, isHidden, supportCount, reactionCounts }` |
| `report:created`   | `board:<slug>` (laporan tidak tersembunyi)               | `{ id, boardSlug, severity }`                                       |
| `queue:updated`    | `user:<id>` setiap Penindak aktif                        | `{ boardSlug, reportId }`                                           |
| `board:updated`    | `board:<slug>`                                           | `{ slug, status, verification, verifiedAt }`                        |

### Job

- Per jam: peringatan laporan Berbahaya yang `dueAt`-nya kurang dari 6 jam lagi (`Report.dueWarningSentAt` mencegah pengiriman ulang). Hasil `runScheduledJobs` menambah `dueWarnings`.
- Harian: ringkasan rating untuk Penindak.

### Deploy satu link

Dengan `NODE_ENV=production` dan folder `client/dist` tersedia, server Express juga menyajikan frontend (semua path selain `/api`, `/uploads`, dan `/socket.io` mengembalikan `index.html`). Content Security Policy mengizinkan script dan frame Cloudflare Turnstile.
