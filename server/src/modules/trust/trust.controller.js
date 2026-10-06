import { sendData } from '../../utils/response.js';
import { requestIdentity } from '../../middlewares/rejectBanned.js';
import { getMyRating, getRatingSummary, rateBoard } from './ratings.service.js';
import {
  getBoardAdminStats,
  getVerificationDetail,
  listCandidates,
  listOfficialBoards,
  revokeVerification,
  skipBoard,
  verifyBoard,
} from './boardAdmin.service.js';

const slugOf = (req) => req.validated.params.slug;

const paged = (handler) => async (req, res) => {
  const { data, meta } = await handler(req.validated.query);
  sendData(res, data, { meta });
};

export async function rate(req, res) {
  sendData(res, await rateBoard(slugOf(req), req.user, req.body, requestIdentity(req)));
}

export async function myRating(req, res) {
  sendData(res, await getMyRating(slugOf(req), req.user));
}

export async function ratingSummary(req, res) {
  sendData(res, await getRatingSummary(slugOf(req), req.user));
}

export async function boardAdminStats(req, res) {
  sendData(res, await getBoardAdminStats());
}

export const candidates = paged(listCandidates);
export const officialBoards = paged(listOfficialBoards);

export async function verificationDetail(req, res) {
  sendData(res, await getVerificationDetail(slugOf(req)));
}

export async function verify(req, res) {
  sendData(res, await verifyBoard(slugOf(req), req.user, req.body));
}

export async function skip(req, res) {
  sendData(res, await skipBoard(slugOf(req), req.user, req.body));
}

export async function revoke(req, res) {
  sendData(res, await revokeVerification(slugOf(req), req.user, req.body));
}
