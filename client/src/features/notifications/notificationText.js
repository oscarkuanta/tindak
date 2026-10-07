const quote = (value) => `"${value ?? 'Laporan'}"`;

const BUILDERS = {
  REPORT_STATUS_CHANGED: (d) =>
    `Status laporan ${quote(d.reportTitle)} berubah menjadi ${d.statusLabel ?? d.status}`,
  REPORT_INFO_REQUESTED: (d) => `Penindak meminta info untuk ${quote(d.reportTitle)}`,
  REPORT_MARKED_DUPLICATE: (d) => `${quote(d.reportTitle)} ditandai sebagai duplikat`,
  REPORT_HIDDEN: (d) => `${quote(d.reportTitle)} disembunyikan sementara untuk ditinjau moderator`,
  REPORT_REMOVED: (d) => `${quote(d.reportTitle)} dihapus moderator`,
  REPORT_SUPPORT_MILESTONE: (d) => `${quote(d.reportTitle)} mendapat ${d.milestone} dukungan`,
  SUPPORTED_REPORT_RESOLVED: (d) =>
    `Laporan yang kamu dukung, ${quote(d.reportTitle)}, sudah selesai`,
  BOARD_NEW_REPORT: (d) => `Laporan baru di ${d.boardName}: ${quote(d.reportTitle)}`,
  HANDLER_NEW_REPORT: (d) => `Laporan baru masuk di ${d.boardName}: ${quote(d.reportTitle)}`,
  HANDLER_DANGEROUS_REPORT: (d) =>
    `Laporan BERBAHAYA masuk di ${d.boardName}: ${quote(d.reportTitle)}`,
  HANDLER_DEADLINE_SOON: (d) =>
    `${quote(d.reportTitle)} (Berbahaya) hampir lewat batas waktu, sisa ${d.hours ?? 6} jam`,
  HANDLER_REPORT_REOPENED: (d) => `${quote(d.reportTitle)} dibuka ulang oleh pelapor`,
  HANDLER_INFO_ANSWERED: (d) => `Pelapor menjawab pertanyaan untuk ${quote(d.reportTitle)}`,
  BOARD_INVITATION: (d) => `Kamu diundang menjadi Penindak ${d.boardName}`,
  BOARD_RATING_DIGEST: (d) => `${d.boardName} mendapat ${d.newRatings} rating baru hari ini`,
  BOARD_VERIFIED: (d) => `${d.boardName} sekarang Official`,
  BOARD_VERIFICATION_REVOKED: (d) =>
    `Status Official ${d.boardName} dicabut${d.reason ? `: ${d.reason}` : ''}`,
  BOARD_CANDIDATE_NEW: (d) => `${d.boardName} masuk antrean Kandidat Official`,
  BOARD_OWNER_CHANGED: (d) => `Penindak Utama Board Official ${d.boardName} berganti`,
  BOARD_NEEDS_REVIEW: (d) => `Board Official ${d.boardName} perlu ditinjau ulang`,
};

export function notificationText(notification) {
  const build = BUILDERS[notification?.type];
  return build ? build(notification.data ?? {}) : 'Ada pembaruan baru';
}
