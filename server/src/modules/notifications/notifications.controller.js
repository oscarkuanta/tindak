import { sendData } from '../../utils/response.js';
import { listNotifications, markAllRead, markRead, unreadCount } from './notifications.service.js';

export async function list(req, res) {
  const { data, meta } = await listNotifications(req.user, req.validated.query);
  sendData(res, data, { meta });
}

export async function count(req, res) {
  sendData(res, await unreadCount(req.user));
}

export async function read(req, res) {
  sendData(res, await markRead(req.user, req.validated.params.id));
}

export async function readAll(req, res) {
  sendData(res, await markAllRead(req.user));
}
