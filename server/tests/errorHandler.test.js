import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { idParamSchema, z } from '@tindak/shared';
import { AppError } from '../src/utils/AppError.js';
import { validate } from '../src/middlewares/validate.js';
import { errorHandler, toAppError } from '../src/middlewares/errorHandler.js';
import { parseEnv } from '../src/config/env.js';

function buildApp(register) {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  register(app);
  app.use(errorHandler);
  return app;
}

function prismaError(code, meta) {
  return Object.assign(new Error('prisma'), {
    name: 'PrismaClientKnownRequestError',
    code,
    meta,
  });
}

describe('toAppError', () => {
  it('meneruskan AppError apa adanya', () => {
    const error = new AppError(403, 'FORBIDDEN', 'Tidak boleh');
    expect(toAppError(error)).toBe(error);
  });

  it('mengubah Prisma P2002 menjadi 409 CONFLICT', () => {
    const result = toAppError(prismaError('P2002', { target: ['email'] }));
    expect(result.status).toBe(409);
    expect(result.code).toBe('CONFLICT');
    expect(result.details).toEqual([{ field: 'email', message: 'Nilai ini sudah dipakai' }]);
  });

  it('mengubah Prisma P2025 menjadi 404 NOT_FOUND', () => {
    const result = toAppError(prismaError('P2025'));
    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('mengembalikan null untuk error tak dikenal', () => {
    expect(toAppError(new Error('boom'))).toBeNull();
  });
});

describe('errorHandler', () => {
  it('mengirim AppError dalam format standar', async () => {
    const app = buildApp((a) =>
      a.get('/x', () => {
        throw new AppError(403, 'FORBIDDEN', 'Kamu tidak punya akses', []);
      }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: { code: 'FORBIDDEN', message: 'Kamu tidak punya akses', details: [] },
    });
  });

  it('mengubah error tak dikenal menjadi 500 tanpa stack di production', async () => {
    vi.resetModules();
    vi.doMock('../src/config/env.js', () => ({ isProduction: true }));
    const { errorHandler: productionHandler } = await import('../src/middlewares/errorHandler.js');
    vi.doUnmock('../src/config/env.js');

    const app = express();
    app.get('/x', async () => {
      throw new Error('rahasia internal');
    });
    app.use(productionHandler);

    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server', details: [] },
    });
  });

  it('menyertakan stack untuk debugging di luar production', async () => {
    const app = buildApp((a) =>
      a.get('/x', async () => {
        throw new Error('rahasia internal');
      }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.error.stack).toContain('rahasia internal');
  });

  it('mengubah JSON rusak menjadi 400 INVALID_JSON', async () => {
    const app = buildApp((a) => a.post('/x', (req, res) => res.json({ data: req.body })));
    const res = await request(app)
      .post('/x')
      .set('Content-Type', 'application/json')
      .send('{"rusak":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('mengubah body terlalu besar menjadi 413', async () => {
    const app = buildApp((a) => a.post('/x', (req, res) => res.json({ data: req.body })));
    const res = await request(app)
      .post('/x')
      .send({ isi: 'a'.repeat(2048) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('validate', () => {
  const bodySchema = z.object({ name: z.string().min(3, 'Nama minimal 3 karakter') });

  it('meneruskan body yang valid', async () => {
    const app = buildApp((a) =>
      a.post('/x', validate(bodySchema), (req, res) => res.json({ data: req.body })),
    );
    const res = await request(app).post('/x').send({ name: 'Budi', extra: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { name: 'Budi' } });
  });

  it('menolak body yang tidak valid dengan detail field', async () => {
    const app = buildApp((a) =>
      a.post('/x', validate(bodySchema), (req, res) => res.json({ data: req.body })),
    );
    const res = await request(app).post('/x').send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'name', message: 'Nama minimal 3 karakter' }]);
  });

  it('memvalidasi params dan menyimpan hasilnya di req.validated', async () => {
    const app = buildApp((a) =>
      a.get('/x/:id', validate(idParamSchema, 'params'), (req, res) =>
        res.json({ data: req.validated.params }),
      ),
    );
    const ok = await request(app).get('/x/7');
    expect(ok.body).toEqual({ data: { id: 7 } });
    const bad = await request(app).get('/x/abc');
    expect(bad.status).toBe(400);
  });

  it('memvalidasi query', async () => {
    const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1) });
    const app = buildApp((a) =>
      a.get('/x', validate(querySchema, 'query'), (req, res) =>
        res.json({ data: req.validated.query }),
      ),
    );
    const res = await request(app).get('/x');
    expect(res.body).toEqual({ data: { page: 1 } });
  });
});

describe('parseEnv', () => {
  const validEnv = {
    DATABASE_URL: 'mysql://root@localhost:3306/tindak',
    SESSION_SECRET: 'x'.repeat(32),
    IP_HASH_SECRET: 'y'.repeat(16),
  };

  it('menerima env yang lengkap dan mengisi default', () => {
    const env = parseEnv({ ...validEnv, ADMIN_EMAILS: ' A@x.com , b@y.com ' });
    expect(env.PORT).toBe(3000);
    expect(env.CLIENT_URL).toBe('http://localhost:5173');
    expect(env.ADMIN_EMAILS).toEqual(['a@x.com', 'b@y.com']);
  });

  it('gagal dengan pesan jelas jika env wajib kurang', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrow(/SESSION_SECRET/);
  });
});
