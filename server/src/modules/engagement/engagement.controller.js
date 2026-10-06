import { sendData } from '../../utils/response.js';
import {
  reactToReport,
  removeReaction,
  supportReport,
  withdrawSupport,
} from './engagement.service.js';

const reportId = (req) => req.validated.params.id;

export async function support(req, res) {
  sendData(res, await supportReport(reportId(req), req.user));
}

export async function unsupport(req, res) {
  sendData(res, await withdrawSupport(reportId(req), req.user));
}

export async function react(req, res) {
  sendData(res, await reactToReport(reportId(req), req.user, req.body));
}

export async function unreact(req, res) {
  sendData(res, await removeReaction(reportId(req), req.user));
}
