import { describe, expect, it, vi } from 'vitest';
import { TRACKING_CODE_ALPHABET } from '@tindak/shared';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { detectImageType } from '../src/lib/images.js';
import { nsfwVerdict } from '../src/lib/nsfw.js';
import { formatWait } from '../src/modules/reports/reportQuota.js';
import { isOverdue } from '../src/modules/reports/reports.presenter.js';
import { hashIp, safeEqualHex, sha256 } from '../src/utils/crypto.js';
import { jpegWithExif, smallPng } from './helpers/images.js';

describe('Kode Lacak', () => {
  it('8 karakter tanpa huruf atau angka yang mirip', () => {
    const codes = Array.from({ length: 300 }, generateTrackingCode);
    for (const code of codes) {
      expect(code).toHaveLength(8);
      expect([...code].every((char) => TRACKING_CODE_ALPHABET.includes(char))).toBe(true);
    }
    expect(TRACKING_CODE_ALPHABET).not.toMatch(/[01ILO]/);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('detectImageType', () => {
  it('mengenali tanda tangan JPEG, PNG, dan WebP, dan menolak yang lain', async () => {
    const sharp = (await import('sharp')).default;
    const png = await smallPng();
    expect(detectImageType(await jpegWithExif({ width: 10, height: 10 }))).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(await sharp(png).webp().toBuffer())).toBe('image/webp');
    expect(detectImageType(await sharp(png).gif().toBuffer())).toBeNull();
    expect(detectImageType(Buffer.from('<svg></svg>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('nsfwVerdict', () => {
  it.each([
    [null, 'ALLOW'],
    [0.1, 'ALLOW'],
    [0.39, 'ALLOW'],
    [0.4, 'BLUR'],
    [0.7, 'BLUR'],
    [0.71, 'REJECT'],
  ])('skor %s menjadi %s', (score, verdict) => {
    expect(nsfwVerdict(score)).toBe(verdict);
  });
});

describe('formatWait', () => {
  it.each([
    [10_000, '1 menit'],
    [90_000, '2 menit'],
    [60 * 60_000, '1 jam'],
    [(23 * 60 + 5) * 60_000, '23 jam 5 menit'],
  ])('%s ms menjadi %s', (ms, text) => {
    expect(formatWait(ms)).toBe(text);
  });
});

describe('isOverdue', () => {
  const past = new Date(Date.now() - 1000);
  it('terlambat jika dueAt lewat dan belum selesai', () => {
    expect(isOverdue({ dueAt: past, status: 'NEW' })).toBe(true);
    expect(isOverdue({ dueAt: past, status: 'IN_PROGRESS' })).toBe(true);
    expect(isOverdue({ dueAt: past, status: 'AWAITING_CONFIRMATION' })).toBe(false);
    expect(isOverdue({ dueAt: past, status: 'RESOLVED' })).toBe(false);
    expect(isOverdue({ dueAt: null, status: 'NEW' })).toBe(false);
  });
});

describe('hash', () => {
  it('hashIp memakai HMAC sehingga berbeda dari sha256 biasa', () => {
    expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('1.2.3.4')).not.toBe(sha256('1.2.3.4'));
    expect(safeEqualHex(sha256('a'), sha256('a'))).toBe(true);
    expect(safeEqualHex(sha256('a'), sha256('b'))).toBe(false);
    expect(safeEqualHex(sha256('a'), 'pendek')).toBe(false);
  });
});

describe('verifyTurnstile', () => {
  async function loadWithSecret(secret) {
    vi.resetModules();
    process.env.TURNSTILE_SECRET_KEY = secret;
    const module = await import('../src/lib/turnstile.js');
    delete process.env.TURNSTILE_SECRET_KEY;
    return module.verifyTurnstile;
  }

  it('kunci test lolos tanpa internet dan kunci gagal menolak', async () => {
    const pass = await loadWithSecret('1x0000000000000000000000000000000AA');
    const fail = await loadWithSecret('2x0000000000000000000000000000000AA');

    await expect(pass('token')).resolves.toBeUndefined();
    await expect(fail('token')).rejects.toMatchObject({ status: 400 });
    await expect(pass('')).rejects.toMatchObject({ status: 400 });
  });

  it('secret asli memanggil Cloudflare dan membalas 503 jika tidak bisa dihubungi', async () => {
    const verify = await loadWithSecret('0x4AAAAAAA-secret-asli');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false })))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(verify('ok', '1.2.3.4')).resolves.toBeUndefined();
    await expect(verify('salah')).rejects.toMatchObject({ status: 400 });
    await expect(verify('x')).rejects.toMatchObject({ status: 503 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('challenges.cloudflare.com');
    fetchMock.mockRestore();
  });
});

describe('env production', () => {
  it('menolak kunci test Turnstile di production', async () => {
    const { parseEnv } = await import('../src/config/env.js');
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://root@localhost:3306/tindak',
      SESSION_SECRET: 'x'.repeat(32),
      IP_HASH_SECRET: 'y'.repeat(16),
      CLIENT_URL: 'https://tindak.example.app',
      UPLOAD_DIR: '/data/uploads',
    };
    expect(() => parseEnv(base)).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(() =>
      parseEnv({ ...base, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }),
    ).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(parseEnv({ ...base, TURNSTILE_SECRET_KEY: 'asli', NSFW_ENABLED: 'true' })).toMatchObject(
      {
        NSFW_ENABLED: true,
      },
    );
  });

  it('menolak secret contoh, alamat tanpa https, dan folder upload kosong', async () => {
    const { parseEnv } = await import('../src/config/env.js');
    const valid = {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://root@localhost:3306/tindak',
      SESSION_SECRET: 'x'.repeat(32),
      IP_HASH_SECRET: 'y'.repeat(16),
      CLIENT_URL: 'https://tindak.example.app',
      UPLOAD_DIR: '/data/uploads',
      TURNSTILE_SECRET_KEY: 'asli',
    };

    expect(parseEnv(valid)).toMatchObject({ UPLOAD_DIR: '/data/uploads' });
    expect(() =>
      parseEnv({ ...valid, SESSION_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter' }),
    ).toThrow(/SESSION_SECRET/);
    expect(() =>
      parseEnv({ ...valid, IP_HASH_SECRET: 'ganti-dengan-string-acak-minimal-16-karakter' }),
    ).toThrow(/IP_HASH_SECRET/);
    expect(() => parseEnv({ ...valid, CLIENT_URL: 'http://localhost:5173' })).toThrow(/CLIENT_URL/);
    expect(() => parseEnv({ ...valid, UPLOAD_DIR: '' })).toThrow(/UPLOAD_DIR/);
    expect(
      parseEnv({
        ...valid,
        NODE_ENV: 'development',
        CLIENT_URL: 'http://localhost:5173',
        UPLOAD_DIR: '',
      }).NODE_ENV,
    ).toBe('development');
  });
});
