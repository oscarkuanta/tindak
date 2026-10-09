import { LockSimple } from '@phosphor-icons/react';

const NOTICES = {
  RESOLVED: {
    tone: 'lock-notice--resolved',
    text: 'Laporan sudah selesai ditangani. Dukungan dan reaksi dikunci.',
  },
  REJECTED: {
    tone: 'lock-notice--rejected',
    text: 'Laporan ditolak Penindak. Dukungan dan reaksi dikunci.',
  },
  DUPLICATE: {
    tone: 'lock-notice--duplicate',
    text: 'Laporan ini duplikat. Beri dukungan di laporan induknya.',
  },
};

export function LockNotice({ status }) {
  const notice = NOTICES[status] ?? {
    tone: 'lock-notice--duplicate',
    text: 'Laporan ditutup. Dukungan dan reaksi dikunci.',
  };
  return (
    <p role="note" className={`lock-notice ${notice.tone}`}>
      <span>{notice.text}</span>
      <LockSimple size={16} weight="bold" aria-hidden="true" className="shrink-0" />
    </p>
  );
}
