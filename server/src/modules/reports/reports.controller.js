import { sendData } from '../../utils/response.js';
import {
  createReport,
  getReportDetail,
  getTrackedReport,
  listBoardReports,
  listHomeFeed,
  claimGuestReports,
  listMyReports,
} from './reports.service.js';

export async function create(req, res) {
  const result = await createReport({
    slug: req.validated.params.slug,
    user: req.user,
    input: req.body,
    files: req.files,
    ip: req.ip,
    guestTokenHash: req.guestTokenHash,
  });
  sendData(res, result, { status: 201 });
}

export async function listForBoard(req, res) {
  const { data, meta } = await listBoardReports(
    req.validated.params.slug,
    req.user,
    req.validated.query,
  );
  sendData(res, data, { meta });
}

export async function detail(req, res) {
  sendData(res, await getReportDetail(req.validated.params.id, req.user));
}

export async function track(req, res) {
  sendData(res, await getTrackedReport(req.validated.params.code, req.validated.query.secret));
}

export async function claim(req, res) {
  sendData(res, await claimGuestReports(req.user, req.validated.body.items));
}

export async function mine(req, res) {
  const { data, meta } = await listMyReports(req.user, req.validated.query);
  sendData(res, data, { meta });
}

export async function homeFeed(req, res) {
  const { data, meta } = await listHomeFeed(req.user, req.validated.query);
  sendData(res, data, { meta });
}
