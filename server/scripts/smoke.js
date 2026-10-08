const baseUrl = (process.argv[2] ?? process.env.SMOKE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const password = process.env.SMOKE_PASSWORD ?? 'demo1234';
const results = [];

function session() {
  let cookie = '';
  return async function call(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'X-Forwarded-Proto': 'https',
        ...(body && { 'Content-Type': 'application/json' }),
        ...(cookie && { Cookie: cookie }),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    if (setCookie.length) cookie = setCookie.map((value) => value.split(';')[0]).join('; ');
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, json, headers: response.headers, text };
  };
}

async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: detail ?? '' });
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
  }
}

function expectStatus(res, status) {
  if (res.status !== status) throw new Error(`status ${res.status}, harusnya ${status}`);
}

async function login(email) {
  const call = session();
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password } });
  expectStatus(res, 200);
  return call;
}

async function main() {
  const guest = session();

  await check('Health dan header keamanan', async () => {
    const res = await guest('/api/health');
    expectStatus(res, 200);
    if (!res.headers.get('content-security-policy')) throw new Error('CSP tidak ada');
    return res.json?.data?.status;
  });
  await check('Halaman depan tersaji (deploy satu link)', async () => {
    const res = await guest('/');
    if (res.status !== 200 || !res.text.includes('id="root"')) {
      throw new Error(`status ${res.status}, frontend tidak tersaji`);
    }
  });
  await check('Tamu: feed beranda', async () => {
    const res = await guest('/api/feed/home');
    expectStatus(res, 200);
    return `${res.json.data.length} laporan`;
  });
  await check('Tamu: Board populer dan pencarian', async () => {
    const popular = await guest('/api/boards/popular');
    const search = await guest('/api/boards/search?q=Yani');
    expectStatus(popular, 200);
    expectStatus(search, 200);
    return search.json.data.map((board) => `${board.name} (${board.trustLabel})`).join(', ');
  });
  await check('Tamu: Lacak laporan demo', async () => {
    const res = await guest('/api/track/TRACK234?secret=demo-lacak-tindak');
    expectStatus(res, 200);
    return res.json.data.status;
  });
  await check('Tamu: endpoint tulis ditolak', async () => {
    const res = await guest('/api/flags', { method: 'POST', body: {} });
    expectStatus(res, 401);
  });

  await check('User: login, notifikasi, laporan saya', async () => {
    const call = await login('siti@demo.test');
    const count = await call('/api/notifications/unread-count');
    const mine = await call('/api/me/reports');
    expectStatus(count, 200);
    expectStatus(mine, 200);
    return `${count.json.data.count} belum dibaca`;
  });
  await check('Penindak Utama: antrean dan statistik', async () => {
    const call = await login('ratna@demo.test');
    const queue = await call('/api/boards/jalan-ahmad-yani-surabaya/queue');
    const stats = await call('/api/boards/jalan-ahmad-yani-surabaya/stats');
    expectStatus(queue, 200);
    expectStatus(stats, 200);
    if (!stats.json.data.handlers) throw new Error('kinerja Penindak kosong untuk OWNER');
    return `${queue.json.meta.total} laporan, ${stats.json.data.totals.total} dalam 30 hari`;
  });
  await check('Penindak: statistik tanpa kinerja per Penindak', async () => {
    const call = await login('maya@demo.test');
    const stats = await call('/api/boards/jalan-ahmad-yani-surabaya/stats');
    expectStatus(stats, 200);
    if (stats.json.data.handlers !== null) throw new Error('HANDLER melihat kinerja Penindak');
  });
  await check('Admin: statistik dan antrean moderasi', async () => {
    const call = await login('admin@demo.test');
    const stats = await call('/api/admin/stats');
    const queue = await call('/api/admin/moderation');
    expectStatus(stats, 200);
    expectStatus(queue, 200);
    return `${queue.json.meta.total} konten menunggu tinjauan`;
  });
  await check('Admin Board: antrean kandidat terisi', async () => {
    const call = await login('adminboard@demo.test');
    const candidates = await call('/api/board-admin/candidates');
    expectStatus(candidates, 200);
    if (candidates.json.data.length < 2) throw new Error('kandidat kurang dari 2');
    return candidates.json.data.map((board) => board.name).join(', ');
  });
  await check('Admin tidak bisa membuka endpoint Admin Board', async () => {
    const call = await login('admin@demo.test');
    expectStatus(await call('/api/board-admin/stats'), 403);
  });
  await check('Akun ter-ban ditolak saat login', async () => {
    const res = await session()('/api/auth/login', {
      method: 'POST',
      body: { email: 'spam@demo.test', password },
    });
    expectStatus(res, 403);
  });

  for (const result of results) {
    process.stdout.write(
      `${result.ok ? 'LOLOS' : 'GAGAL'}  ${result.name}${result.detail ? `  (${result.detail})` : ''}\n`,
    );
  }
  const failed = results.filter((result) => !result.ok).length;
  process.stdout.write(
    `\n${results.length - failed}/${results.length} cek lolos untuk ${baseUrl}\n`,
  );
  process.exitCode = failed ? 1 : 0;
}

await main();
