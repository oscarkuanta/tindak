import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '@tindak/shared';
import { env } from '../../config/env.js';
import { getSessionMiddleware } from '../../config/session.js';
import { configurePassport } from '../../config/passport.js';
import { logger } from '../../lib/logger.js';
import { boardRoom, reportRoom, setRealtimeServer, userRoom } from '../../lib/realtime.js';
import { canSubscribeBoard, canSubscribeReport } from './realtime.service.js';

function respond(ack, ok) {
  if (typeof ack === 'function') ack({ ok });
}

function guarded(socket, check, room) {
  return async (payload, ack) => {
    try {
      const allowed = await check(payload);
      if (allowed) socket.join(room(payload));
      respond(ack, allowed);
    } catch (error) {
      logger.warn({ err: error }, 'Gagal memproses langganan realtime');
      respond(ack, false);
    }
  };
}

export function isAllowedOrigin(origin) {
  return !origin || origin === env.CLIENT_URL;
}

export function attachSocketServer(httpServer) {
  const passport = configurePassport();
  const io = new Server(httpServer, {
    serveClient: false,
    cors: { origin: env.CLIENT_URL, credentials: true },
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
  });

  io.engine.use(getSessionMiddleware());
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  io.on('connection', (socket) => {
    const user = socket.request.user || null;
    if (user) socket.join(userRoom(user.id));

    socket.on(
      SOCKET_EVENTS.BOARD_SUBSCRIBE,
      guarded(socket, (slug) => canSubscribeBoard(slug, user), boardRoom),
    );
    socket.on(SOCKET_EVENTS.BOARD_UNSUBSCRIBE, (slug) => socket.leave(boardRoom(slug)));
    socket.on(
      SOCKET_EVENTS.REPORT_SUBSCRIBE,
      guarded(
        socket,
        (payload) => canSubscribeReport(payload?.id, user, payload ?? {}),
        (payload) => reportRoom(Number(payload?.id)),
      ),
    );
    socket.on(SOCKET_EVENTS.REPORT_UNSUBSCRIBE, (payload) =>
      socket.leave(reportRoom(Number(payload?.id))),
    );
  });

  setRealtimeServer(io);
  return io;
}
