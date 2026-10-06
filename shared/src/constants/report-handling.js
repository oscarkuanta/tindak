export const REPORT_HANDLING_STATUSES = Object.freeze({
  NEW: 'NEW',
  NEED_INFO: 'NEED_INFO',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
  REJECTED: 'REJECTED',
  DUPLICATE: 'DUPLICATE',
});

export const REPORT_HANDLING_STATUS_LABELS = Object.freeze({
  NEW: 'Baru',
  NEED_INFO: 'Perlu Info',
  IN_PROGRESS: 'Diproses',
  AWAITING_CONFIRMATION: 'Menunggu Konfirmasi',
  RESOLVED: 'Selesai',
  REOPENED: 'Dibuka Ulang',
  REJECTED: 'Ditolak',
  DUPLICATE: 'Duplikat',
});

export const REPORT_HANDLING_ACTIONS = Object.freeze({
  PROCESS: 'PROCESS',
  REQUEST_INFO: 'REQUEST_INFO',
  ANSWER_INFO: 'ANSWER_INFO',
  REJECT: 'REJECT',
  DUPLICATE: 'DUPLICATE',
  RESOLVE: 'RESOLVE',
  CONFIRM: 'CONFIRM',
});

export const REPORT_REJECTION_REASONS = Object.freeze({
  NOT_PHYSICAL: 'NOT_PHYSICAL',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  INSUFFICIENT_INFORMATION: 'INSUFFICIENT_INFORMATION',
  FALSE_REPORT: 'FALSE_REPORT',
  OTHER: 'OTHER',
});

export const REPORT_REJECTION_REASON_LABELS = Object.freeze({
  NOT_PHYSICAL: 'Bukan masalah fisik/fasilitas',
  OUT_OF_SCOPE: 'Di luar cakupan Board',
  INSUFFICIENT_INFORMATION: 'Informasi tidak cukup',
  FALSE_REPORT: 'Laporan tidak benar',
  OTHER: 'Lainnya',
});

export const REPORT_HANDLING_KANBAN_COLUMNS = Object.freeze([
  { id: 'NEW', label: 'Baru', statuses: ['NEW'] },
  { id: 'NEED_INFO', label: 'Perlu Info', statuses: ['NEED_INFO'] },
  { id: 'IN_PROGRESS', label: 'Diproses', statuses: ['IN_PROGRESS', 'REOPENED'] },
  {
    id: 'AWAITING_CONFIRMATION',
    label: 'Menunggu Konfirmasi',
    statuses: ['AWAITING_CONFIRMATION'],
  },
  { id: 'RESOLVED', label: 'Selesai', statuses: ['RESOLVED'] },
]);
