import sharp from 'sharp';

export async function jpegWithExif({ width = 2000, height = 1200 } = {}) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } },
  })
    .withExif({
      IFD0: { Copyright: 'Rahasia Pelapor', ImageDescription: 'Lokasi rumah', Artist: 'Budi' },
    })
    .jpeg()
    .toBuffer();
}

export async function smallPng() {
  return sharp({
    create: { width: 40, height: 30, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
  })
    .png()
    .toBuffer();
}
