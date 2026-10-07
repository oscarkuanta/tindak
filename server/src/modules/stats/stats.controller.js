import { sendData } from '../../utils/response.js';
import { getBoardStats } from './stats.service.js';
import { exportBoardReports } from './export.service.js';

export async function stats(req, res) {
  sendData(res, await getBoardStats(req.board, req.membership, req.validated.query));
}

export async function exportCsv(req, res) {
  const { filename, content } = await exportBoardReports(req.board, req.validated.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}
