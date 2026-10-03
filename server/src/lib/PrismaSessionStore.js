import session from 'express-session';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function resolveExpiry(sess) {
  const expires = sess?.cookie?.expires;
  if (expires) return new Date(expires);
  const maxAge = sess?.cookie?.maxAge ?? sess?.cookie?.originalMaxAge;
  return new Date(Date.now() + (maxAge ?? DEFAULT_TTL_MS));
}

function toCallback(promise, callback) {
  promise.then(
    (result) => callback?.(null, result),
    (error) => callback?.(error),
  );
}

export class PrismaSessionStore extends session.Store {
  constructor(prisma, { pruneIntervalMs = 15 * 60 * 1000 } = {}) {
    super();
    this.prisma = prisma;
    if (pruneIntervalMs > 0) {
      this.pruneTimer = setInterval(() => {
        this.prune().catch(() => {});
      }, pruneIntervalMs);
      this.pruneTimer.unref();
    }
  }

  get(sid, callback) {
    toCallback(this.#get(sid), callback);
  }

  set(sid, sess, callback) {
    toCallback(this.#set(sid, sess), callback);
  }

  touch(sid, sess, callback) {
    toCallback(this.#touch(sid, sess), callback);
  }

  destroy(sid, callback) {
    toCallback(this.prisma.session.deleteMany({ where: { id: sid } }), callback);
  }

  async prune() {
    const { count } = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }

  close() {
    clearInterval(this.pruneTimer);
  }

  async #get(sid) {
    const row = await this.prisma.session.findUnique({ where: { id: sid } });
    if (!row) return null;
    if (row.expiresAt <= new Date()) {
      await this.prisma.session.deleteMany({ where: { id: sid } });
      return null;
    }
    return JSON.parse(row.data);
  }

  async #set(sid, sess) {
    const data = JSON.stringify(sess);
    const expiresAt = resolveExpiry(sess);
    await this.prisma.session.upsert({
      where: { id: sid },
      create: { id: sid, data, expiresAt },
      update: { data, expiresAt },
    });
  }

  async #touch(sid, sess) {
    await this.prisma.session.updateMany({
      where: { id: sid },
      data: { expiresAt: resolveExpiry(sess) },
    });
  }
}
