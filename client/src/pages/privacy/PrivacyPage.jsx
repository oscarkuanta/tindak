import { Card } from '../../components/ui/index.js';

const SECTIONS = [
  {
    title: 'Data yang kami simpan',
    items: [
      'Akun: nama, email, password yang sudah di-hash dengan bcrypt, dan foto profil jika kamu masuk dengan Google.',
      'Login Google: kami hanya meminta nama, email, dan foto profil. Kami tidak membaca data Google lainnya.',
      'Laporan: judul, deskripsi, lokasi, kategori, tingkat bahaya, dan foto yang kamu unggah. Metadata lokasi (EXIF/GPS) dihapus dari foto.',
      'Tamu: laporan tanpa akun disimpan dengan Kode Lacak dan tanda perangkat yang di-hash, tanpa nama.',
      'Keamanan: alamat IP disimpan dalam bentuk hash untuk mencegah spam dan dihapus otomatis setelah 90 hari.',
    ],
  },
  {
    title: 'Untuk apa data dipakai',
    items: [
      'Menampilkan laporan ke publik dan meneruskannya ke Penindak Board yang dituju.',
      'Mengirim notifikasi tentang laporan dan Board yang kamu ikuti.',
      'Mencegah penyalahgunaan seperti spam, laporan palsu, dan akun yang di-ban.',
    ],
  },
  {
    title: 'Yang terlihat oleh orang lain',
    items: [
      'Laporan, foto, dan nama pelapor terlihat publik, kecuali kamu memilih melapor secara anonim.',
      'Email dan password tidak pernah ditampilkan ke pengguna lain.',
      'Kami tidak menjual atau membagikan data ke pihak ketiga untuk iklan.',
    ],
  },
  {
    title: 'Cookie',
    items: [
      'Kami memakai cookie sesi untuk menjaga kamu tetap masuk, dan cookie tamu untuk membatasi spam laporan. Tidak ada cookie iklan atau pelacak pihak ketiga.',
      'Pencegahan bot memakai Cloudflare Turnstile.',
    ],
  },
  {
    title: 'Hak kamu',
    items: [
      'Kamu bisa melapor secara anonim kapan saja, sehingga namamu tidak ditampilkan di laporan.',
      'Untuk menghapus akun atau data, hubungi pengelola T!ndak lewat repositori proyek di GitHub (oscarkuanta/tindak).',
    ],
  },
];

export function PrivacyPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <p className="text-sm font-semibold text-brand">Diperbarui 10 Oktober 2026</p>
        <h1 className="mt-1 text-2xl">Kebijakan Privasi T!ndak</h1>
        <p className="mt-2 text-sm text-text-muted">
          T!ndak adalah platform pelaporan masalah fasilitas publik berbasis komunitas. Halaman ini
          menjelaskan data apa yang kami simpan dan bagaimana kami memakainya.
        </p>
      </header>
      {SECTIONS.map((section) => (
        <Card key={section.title} as="section">
          <h2 className="text-lg">{section.title}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ))}
    </section>
  );
}
