import { sendData } from '../../utils/response.js';
import {
  answerInfo,
  confirmReport,
  listQueue,
  markDuplicate,
  processReport,
  rejectReport,
  requestInfo,
  resolveReport,
} from './handling.service.js';

const reportId = (req) => req.validated.params.id;

export async function queue(req, res) {
  const { data, meta } = await listQueue(req.board, req.validated.query);
  sendData(res, data, { meta });
}

export async function processAction(req, res) {
  sendData(res, await processReport(reportId(req), req.user, req.body));
}

export async function askInfo(req, res) {
  sendData(res, await requestInfo(reportId(req), req.user, req.body));
}

export async function answer(req, res) {
  sendData(res, await answerInfo(reportId(req), req.user, req.body));
}

export async function reject(req, res) {
  sendData(res, await rejectReport(reportId(req), req.user, req.body));
}

export async function duplicate(req, res) {
  sendData(res, await markDuplicate(reportId(req), req.user, req.body));
}

export async function resolve(req, res) {
  sendData(res, await resolveReport(reportId(req), req.user, req.body, req.files));
}

export async function confirm(req, res) {
  sendData(res, await confirmReport(reportId(req), req.user, req.body, req.files));
}
