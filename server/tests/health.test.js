import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('mengembalikan status ok saat database terhubung', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok', db: 'ok' } });
  });

  it('mengembalikan 503 saat database tidak bisa dihubungi', async () => {
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('down'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    spy.mockRestore();
  });
});

describe('Endpoint tidak dikenal', () => {
  it('mengembalikan 404 dalam format error standar', async () => {
    const res = await request(app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint GET /api/tidak-ada tidak ditemukan',
        details: [],
      },
    });
  });
});
