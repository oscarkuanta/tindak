import {
  REPORT_SEVERITY_LABELS,
  REPORT_STATUS_LABELS,
  STATS_TIMEZONE_OFFSET_HOURS,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { rangeStart } from './stats.service.js';

const EXPORT_LIMIT = 5000;
const BOM = String.fromCharCode(0xfeff);
const FORMULA_START = /^[=+\-@\t\r]/;

const HEADERS = [
  'ID',
  'Judul',
  'Kategori',
  'Tingkat Bahaya',
  'Status',
  'Dibuat (WIB)',
  'Batas Waktu (WIB)',
  'Ditandai Selesai (WIB)',
  'Lokasi',
  'Dukungan',
];

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatLocal(date) {
  if (!date) return '';
  const local = new Date(new Date(date).getTime() + STATS_TIMEZONE_OFFSET_HOURS * 3600 * 1000);
  return local.toISOString().slice(0, 16).replace('T', ' ');
}

export async function exportBoardReports(board, { range }, now = new Date()) {
  const since = rangeStart(range, now);
  const reports = await prisma.report.findMany({
    where: { boardId: board.id, removedAt: null, createdAt: { gte: since } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: EXPORT_LIMIT,
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      dueAt: true,
      locationDetail: true,
      supportCount: true,
      category: { select: { name: true } },
      events: {
        where: { toStatus: 'AWAITING_CONFIRMATION' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  const rows = reports.map((report) => [
    report.id,
    report.title,
    report.category?.name,
    REPORT_SEVERITY_LABELS[report.severity] ?? report.severity,
    REPORT_STATUS_LABELS[report.status] ?? report.status,
    formatLocal(report.createdAt),
    formatLocal(report.dueAt),
    formatLocal(report.events[0]?.createdAt),
    report.locationDetail,
    report.supportCount,
  ]);
  const content = [HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return {
    filename: `statistik-${board.slug}-${range}.csv`,
    content: `${BOM}${content}\r\n`,
  };
}
