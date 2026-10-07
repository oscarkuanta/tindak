import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outputDir = fileURLToPath(new URL('../prisma/demo-photos/', import.meta.url));
const W = 960;
const H = 640;

const sky = (top, bottom) =>
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/>`;

const road = (color = '#55595e') =>
  `<polygon points="0,${H} ${W},${H} ${W * 0.62},330 ${W * 0.38},330" fill="${color}"/><polygon points="${W * 0.495},330 ${W * 0.505},330 ${W * 0.52},${H} ${W * 0.48},${H}" fill="#e9e3c8" opacity="0.8"/>`;

const grass = (color = '#7fae5a') =>
  `<rect y="330" width="${W}" height="${H - 330}" fill="${color}"/>`;

const building = (x, w, h, color) =>
  `<rect x="${x}" y="${330 - h}" width="${w}" height="${h}" fill="${color}"/>${Array.from(
    { length: Math.floor(h / 50) },
    (_, row) =>
      Array.from(
        { length: Math.floor(w / 45) },
        (_, col) =>
          `<rect x="${x + 12 + col * 45}" y="${330 - h + 14 + row * 50}" width="22" height="28" fill="#f4f1de" opacity="0.85"/>`,
      ).join(''),
  ).join('')}`;

const lamp = (x, on) =>
  `<rect x="${x}" y="150" width="10" height="200" fill="#3d4147"/><rect x="${x - 40}" y="150" width="50" height="10" fill="#3d4147"/><ellipse cx="${x - 35}" cy="165" rx="16" ry="8" fill="${on ? '#ffe680' : '#8a8f96'}"/>`;

const tree = (x, y, scale = 1) =>
  `<rect x="${x - 8 * scale}" y="${y}" width="${16 * scale}" height="${60 * scale}" fill="#6b4a2b"/><circle cx="${x}" cy="${y - 10 * scale}" r="${45 * scale}" fill="#4f8a3c"/>`;

const scenes = {
  'jalan-berlubang': () =>
    `${sky('#9cc9ec', '#dcefff')}${grass()}${road()}<ellipse cx="480" cy="520" rx="150" ry="55" fill="#2c2f33"/><ellipse cx="470" cy="510" rx="110" ry="35" fill="#5d7c8f" opacity="0.7"/><ellipse cx="610" cy="430" rx="50" ry="16" fill="#2c2f33"/>${tree(110, 280)}${tree(860, 270, 1.2)}`,
  'jalan-diperbaiki': () =>
    `${sky('#9cc9ec', '#dcefff')}${grass()}${road('#3f4247')}<ellipse cx="480" cy="520" rx="150" ry="55" fill="#2f3236"/>${tree(110, 280)}${tree(860, 270, 1.2)}<rect x="680" y="470" width="20" height="60" fill="#f08a24"/><rect x="250" y="470" width="20" height="60" fill="#f08a24"/>`,
  'sampah-menumpuk': () =>
    `${sky('#a9cfe8', '#e8f3fb')}${grass('#8f9b6c')}${building(80, 300, 220, '#c9a27e')}${building(560, 320, 180, '#b9c4cc')}${Array.from(
      { length: 14 },
      (_, i) =>
        `<ellipse cx="${330 + (i % 7) * 50}" cy="${520 - Math.floor(i / 7) * 45}" rx="42" ry="34" fill="${['#2f3a2f', '#3b4a5c', '#5b4636', '#2a2a2a'][i % 4]}"/>`,
    ).join('')}<rect x="300" y="560" width="380" height="20" fill="#6d5d4b" opacity="0.5"/>`,
  'sampah-bersih': () =>
    `${sky('#a9cfe8', '#e8f3fb')}${grass('#8fb96c')}${building(80, 300, 220, '#c9a27e')}${building(560, 320, 180, '#b9c4cc')}<rect x="440" y="440" width="90" height="120" rx="8" fill="#2f8f4e"/><rect x="430" y="430" width="110" height="18" rx="6" fill="#256f3d"/>`,
  'lampu-mati': () =>
    `${sky('#1d2340', '#3a4366')}<rect y="330" width="${W}" height="${H - 330}" fill="#2b2f36"/>${road('#33363b')}${lamp(250, false)}${lamp(760, false)}${lamp(500, true)}<circle cx="820" cy="90" r="30" fill="#f1f0d8"/>`,
  'drainase-tersumbat': () =>
    `${sky('#8fa7b8', '#cad7df')}${grass('#6f8f5a')}<rect x="0" y="420" width="${W}" height="120" fill="#5e6b6f"/><rect x="0" y="440" width="${W}" height="80" fill="#4b6b5a"/>${Array.from(
      { length: 10 },
      (_, i) =>
        `<ellipse cx="${100 + i * 85}" cy="${470 + (i % 3) * 10}" rx="30" ry="14" fill="${['#c9b38a', '#7a6a55', '#e0e0e0'][i % 3]}"/>`,
    ).join('')}${building(600, 300, 200, '#d6c6a8')}`,
  'pohon-tumbang': () =>
    `${sky('#9cc9ec', '#dcefff')}${grass()}${road()}<g transform="rotate(-12 480 470)"><rect x="200" y="455" width="520" height="34" rx="14" fill="#6b4a2b"/><circle cx="740" cy="460" r="80" fill="#4f8a3c"/><circle cx="660" cy="430" r="55" fill="#5d9a47"/></g>${tree(120, 280)}`,
  'fasilitas-sekolah-rusak': () =>
    `<rect width="${W}" height="${H}" fill="#efe6d2"/><rect y="460" width="${W}" height="180" fill="#b88a5a"/><rect x="80" y="80" width="500" height="250" fill="#2f5d48" stroke="#7a5230" stroke-width="16"/><g transform="rotate(18 650 470)"><rect x="560" y="420" width="200" height="22" fill="#8a5a33"/><rect x="580" y="440" width="14" height="90" fill="#555"/></g><rect x="720" y="500" width="14" height="90" fill="#555" transform="rotate(-35 727 545)"/><rect x="250" y="440" width="180" height="22" fill="#8a5a33"/><rect x="265" y="460" width="14" height="80" fill="#555"/><rect x="400" y="460" width="14" height="80" fill="#555"/>`,
  'toilet-rusak': () =>
    `<rect width="${W}" height="${H}" fill="#dfe8ea"/>${Array.from(
      { length: 12 },
      (_, i) =>
        `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="${H}" stroke="#c4d1d4" stroke-width="3"/>`,
    ).join(
      '',
    )}<rect y="470" width="${W}" height="170" fill="#9fb3b8"/><ellipse cx="480" cy="460" rx="110" ry="40" fill="#fafafa" stroke="#9aa" stroke-width="6"/><rect x="420" y="320" width="120" height="130" rx="12" fill="#fafafa" stroke="#9aa" stroke-width="6"/><ellipse cx="560" cy="560" rx="160" ry="30" fill="#7fa9c4" opacity="0.6"/><path d="M430 340 L470 400 L455 440" stroke="#555" stroke-width="5" fill="none"/>`,
  'pagar-rusak': () =>
    `${sky('#9cc9ec', '#dcefff')}${grass('#87b062')}${Array.from({ length: 9 }, (_, i) => {
      const broken = i === 4 || i === 5;
      return `<rect x="${80 + i * 95}" y="${broken ? 400 : 300}" width="16" height="${broken ? 120 : 220}" fill="#7a7f86" transform="rotate(${broken ? (i === 4 ? -25 : 30) : 0} ${88 + i * 95} 500)"/>`;
    }).join(
      '',
    )}<rect x="80" y="320" width="380" height="10" fill="#7a7f86"/><rect x="590" y="320" width="300" height="10" fill="#7a7f86"/>`,
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  for (const [name, draw] of Object.entries(scenes)) {
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${draw()}</svg>`;
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
    await writeFile(path.join(outputDir, `${name}.jpg`), jpeg);
  }
  process.stdout.write(`${Object.keys(scenes).length} foto demo dibuat di ${outputDir}\n`);
}

await main();
