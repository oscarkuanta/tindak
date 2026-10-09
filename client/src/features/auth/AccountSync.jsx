import { useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from './hooks.js';
import { ToastContext } from '../boards/toastContext.js';
import { moveGuestCityTo } from '../location/myCity.js';
import { claimGuestReports } from '../reports/api.js';
import {
  clearTrackedReports,
  normalizeTrackingCode,
  readTrackedReports,
} from '../reports/trackingStorage.js';

export function AccountSync() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const toast = useContext(ToastContext);
  const showToast = toast?.showToast;
  const syncedFor = useRef(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId || syncedFor.current === userId) return;
    syncedFor.current = userId;
    moveGuestCityTo(userId);

    const items = readTrackedReports()
      .filter((entry) => entry.secret)
      .map((entry) => ({
        trackingCode: normalizeTrackingCode(entry.trackingCode),
        secret: entry.secret,
      }))
      .slice(0, 50);
    if (!items.length) {
      clearTrackedReports();
      return;
    }
    claimGuestReports(items)
      .then((response) => {
        clearTrackedReports();
        const claimed = response.data?.claimed ?? 0;
        if (claimed > 0) {
          queryClient.invalidateQueries({ queryKey: ['me', 'reports'] });
          showToast?.(
            `${claimed} laporan yang kamu kirim sebagai tamu sekarang ada di Laporan Saya`,
          );
        }
      })
      .catch(() => {
        syncedFor.current = null;
      });
  }, [userId, queryClient, showToast]);

  useEffect(() => {
    if (!userId) syncedFor.current = null;
  }, [userId]);

  return null;
}
