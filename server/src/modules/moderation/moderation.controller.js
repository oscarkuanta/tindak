import { sendData } from '../../utils/response.js';
import { createFlag } from './flags.service.js';
import {
  createBan,
  dismissBoardFlags,
  freezeBoard,
  getStats,
  listAdminBoards,
  listAuditLogs,
  listBans,
  listModerationQueue,
  listUsers,
  removeReport,
  restoreReport,
  revokeBan,
  unfreezeBoard,
} from './admin.service.js';

const paged = (handler) => async (req, res) => {
  const { data, meta } = await handler(req.validated.query);
  sendData(res, data, { meta });
};

export async function flag(req, res) {
  sendData(res, await createFlag(req.user, req.body), { status: 201 });
}

export async function stats(req, res) {
  sendData(res, await getStats());
}

export const moderation = paged(listModerationQueue);
export const bans = paged(listBans);
export const boards = paged(listAdminBoards);
export const users = paged(listUsers);
export const auditLogs = paged(listAuditLogs);

export async function restore(req, res) {
  sendData(res, await restoreReport(req.validated.params.id, req.user, req.body));
}

export async function remove(req, res) {
  sendData(res, await removeReport(req.validated.params.id, req.user, req.body));
}

export async function ban(req, res) {
  sendData(res, await createBan(req.user, req.body), { status: 201 });
}

export async function unban(req, res) {
  sendData(res, await revokeBan(req.validated.params.id, req.user));
}

export async function freeze(req, res) {
  sendData(res, await freezeBoard(req.validated.params.slug, req.user, req.body));
}

export async function unfreeze(req, res) {
  sendData(res, await unfreezeBoard(req.validated.params.slug, req.user));
}

export async function dismissFlags(req, res) {
  sendData(res, await dismissBoardFlags(req.validated.params.slug, req.user, req.body));
}
