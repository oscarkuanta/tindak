export const TRUST_TOOLTIP = 'Dihitung otomatis dari rating dan kecepatan tanggap';

export function formatScore(score) {
  if (score === null || score === undefined) return null;
  return Number(score).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatPercent(value) {
  return value === null || value === undefined ? 'Belum ada data' : `${value}%`;
}
