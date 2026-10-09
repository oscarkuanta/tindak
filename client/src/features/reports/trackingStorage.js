const STORAGE_KEY = 'tindak.trackedReports';

export function normalizeTrackingCode(value = '') {
  return String(value).trim().toUpperCase().replace(/^TND-/, '').replace(/[\s-]/g, '');
}

export function getSecretFromTrackingUrl(trackingUrl) {
  if (!trackingUrl || typeof window === 'undefined') return '';
  try {
    return new URL(trackingUrl, window.location.origin).searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
}

export function readTrackedReports() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const entries = value ? JSON.parse(value) : [];
    return Array.isArray(entries) ? entries.filter((entry) => entry?.trackingCode) : [];
  } catch {
    return [];
  }
}

export function saveTrackedReport(report) {
  try {
    const entries = readTrackedReports().filter(
      (entry) =>
        normalizeTrackingCode(entry.trackingCode) !== normalizeTrackingCode(report.trackingCode),
    );
    entries.unshift({ ...report, savedAt: new Date().toISOString() });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function findTrackedReport(code) {
  const normalized = normalizeTrackingCode(code);
  return readTrackedReports().find(
    (entry) => normalizeTrackingCode(entry.trackingCode) === normalized,
  );
}

export function clearTrackedReports() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
