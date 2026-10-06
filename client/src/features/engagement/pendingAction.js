const STORAGE_KEY = 'tindak.pendingEngagement';
const MAX_AGE_MS = 30 * 60 * 1000;

export function savePendingAction(action) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...action, savedAt: Date.now() }));
  } catch {
    return;
  }
}

export function takePendingAction(reportId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const action = JSON.parse(raw);
    if (Date.now() - action.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (action.reportId !== reportId) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return action;
  } catch {
    return null;
  }
}
