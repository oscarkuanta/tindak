# Struktur Database T!indak

Database memakai MySQL 8 (atau MariaDB) lewat Prisma 7. Skema tunggal ada di [`server/prisma/schema.prisma`](../server/prisma/schema.prisma) dan setiap perubahan tercatat sebagai migrasi di `server/prisma/migrations`.

## Aturan Penamaan

- Nama model di kode memakai PascalCase bahasa Inggris (`BoardMember`), nama tabel memakai snake_case jamak (`board_members`).
- Nama kolom di kode memakai camelCase (`createdAt`), di database snake_case (`created_at`).
- Setiap tabel punya primary key `id` (auto increment). Kolom relasi berakhiran `_id`.
- Nilai tetap seperti role, status, dan tingkat bahaya disimpan sebagai enum, bukan teks bebas.

## Diagram Relasi (ERD)

Diagram ini ditampilkan otomatis oleh GitHub. Kolom yang ditulis hanya kunci dan kolom penting.

```mermaid
erDiagram
  users |o--o{ sessions : "punya"
  users ||--o{ boards : "memiliki (owner)"
  users |o--o{ boards : "memverifikasi"
  users ||--o{ board_members : "menjadi Penindak"
  users ||--o{ board_followers : "mengikuti"
  users |o--o{ reports : "melapor"
  users |o--o{ reports : "ditugaskan"
  users ||--o{ supports : "mendukung"
  users ||--o{ reactions : "bereaksi"
  users |o--o{ flags : "menandai"
  users |o--o{ bans : "membuat ban"
  users |o--o{ audit_logs : "pelaku"
  users ||--o{ board_ratings : "memberi rating"
  users |o--o{ board_verification_logs : "pelaku"
  users ||--o{ notifications : "menerima"
  users |o--o{ report_events : "pelaku"
  users |o--o{ info_requests : "bertanya"

  boards ||--o{ board_members : "punya"
  boards ||--o{ categories : "punya"
  boards ||--o{ board_followers : "diikuti"
  boards ||--o{ reports : "menerima"
  boards ||--o{ board_ratings : "dinilai"
  boards ||--o{ board_verification_logs : "riwayat verifikasi"

  categories ||--o{ reports : "mengelompokkan"
  reports |o--o{ reports : "duplikat dari"
  reports ||--o{ report_media : "foto"
  reports ||--o{ report_events : "riwayat status"
  reports ||--o{ info_requests : "permintaan info"
  reports ||--o{ supports : "didukung"
  reports ||--o{ reactions : "direaksi"

  users {
    int id PK
    varchar email UK
    varchar google_id UK
    enum role "USER, ADMIN, BOARD_ADMIN"
  }
  boards {
    int id PK
    varchar slug UK
    int owner_id FK
    int verified_by_id FK
    enum type
    enum status "ACTIVE, INACTIVE, FROZEN"
    enum verification "COMMUNITY, OFFICIAL"
    datetime frozen_until
  }
  board_members {
    int id PK
    int board_id FK
    int user_id FK
    int invited_by_id FK
    enum role "OWNER, HANDLER"
    enum status
  }
  categories {
    int id PK
    int board_id FK
    varchar name
  }
  board_followers {
    int id PK
    int board_id FK
    int user_id FK
    enum notify_level
  }
  reports {
    int id PK
    int board_id FK
    int category_id FK
    int user_id FK
    int assignee_id FK
    int parent_id FK
    char tracking_code UK
    enum severity "LOW, MEDIUM, DANGEROUS"
    enum status
    int priority_score
  }
  report_media {
    int id PK
    int report_id FK
    enum kind "BEFORE, AFTER, EXTRA"
  }
  report_events {
    int id PK
    int report_id FK
    int actor_id FK
    enum from_status
    enum to_status
  }
  info_requests {
    int id PK
    int report_id FK
    int asked_by_id FK
  }
  supports {
    int id PK
    int report_id FK
    int user_id FK
  }
  reactions {
    int id PK
    int report_id FK
    int user_id FK
    enum type "DANGEROUS, LONG_STANDING, ANNOYING"
  }
  flags {
    int id PK
    int user_id FK
    enum target_type "REPORT, BOARD"
    int target_id
    enum reason
  }
  bans {
    int id PK
    int created_by_id FK
    enum target_type "USER, GUEST_TOKEN, IP"
    datetime expires_at
  }
  audit_logs {
    int id PK
    int actor_user_id FK
    varchar action
  }
  board_ratings {
    int id PK
    int board_id FK
    int user_id FK
    int stars
  }
  board_verification_logs {
    int id PK
    int board_id FK
    int actor_user_id FK
    enum action
  }
  notifications {
    int id PK
    int user_id FK
    varchar type
    datetime read_at
  }
  sessions {
    varchar id PK
    int user_id FK
  }
```

## Penjelasan Tabel

| Kelompok    | Tabel                                                       | Fungsi                                                                                      |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Akun        | `users`, `sessions`                                         | Akun warga dan staf, serta sesi login (cookie httpOnly)                                     |
| Board       | `boards`, `board_members`, `categories`, `board_followers`  | Tempat pengaduan, Penindak Utama dan Penindak, kategori laporan, dan pengikut               |
| Laporan     | `reports`, `report_media`, `report_events`, `info_requests` | Laporan, foto sebelum dan sesudah, riwayat perubahan status, dan permintaan info ke pelapor |
| Partisipasi | `supports`, `reactions`                                     | Dukungan dan reaksi warga yang membentuk skor prioritas                                     |
| Moderasi    | `flags`, `bans`, `audit_logs`                               | Tanda pelanggaran, ban akun/perangkat/IP, dan catatan semua aksi Admin                      |
| Kepercayaan | `board_ratings`, `board_verification_logs`                  | Rating bintang Board dan riwayat verifikasi Official                                        |
| Notifikasi  | `notifications`                                             | Notifikasi per user                                                                         |

## Keputusan Desain

- **Hapus berantai dipilih per relasi.** Data milik Board atau laporan (foto, riwayat, dukungan) ikut terhapus (`Cascade`). Data yang perlu jejak (pelaku audit log, pemberi ban, pelapor) cukup dikosongkan (`SetNull`) agar riwayat tetap utuh. Board tidak bisa dihapus selama pemiliknya masih ada (`Restrict`).
- **Satu user satu aksi.** Kombinasi unik mencegah dukungan, reaksi, rating, dan tanda ganda, misalnya `supports (report_id, user_id)` dan `flags (target_type, target_id, user_id)`.
- **Tanda dan audit log bersifat polimorfik.** `flags` dan `audit_logs` menyimpan `target_type` + `target_id` karena targetnya bisa laporan atau Board. Integritasnya dijaga di service, dan kolom itu diberi index.
- **Angka yang sering dibaca disimpan di laporan.** `support_count`, jumlah reaksi, `priority_score`, dan `hot_score` dihitung ulang saat ada perubahan, sehingga feed dan antrean tidak perlu menghitung ulang setiap kali dibuka.
- **Data sensitif tidak disimpan mentah.** Password memakai bcrypt, kode rahasia pelacakan dan IP disimpan sebagai hash SHA-256.
- **Index mengikuti query.** Contoh: `reports (board_id, status)` untuk antrean Penindak, `notifications (user_id, read_at)` untuk jumlah belum dibaca, `bans (target_type, target_value)` untuk cek ban.
