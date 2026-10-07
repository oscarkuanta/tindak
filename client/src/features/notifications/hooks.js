import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './api.js';

export const notificationsKey = (params) => ['notifications', 'list', params];
export const unreadCountKey = ['notifications', 'unread-count'];

export function useNotifications(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: notificationsKey(params),
    queryFn: () => getNotifications(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUnreadCount({ enabled = true } = {}) {
  return useQuery({ queryKey: unreadCountKey, queryFn: getUnreadCount, enabled });
}

function useNotificationMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export const useMarkRead = () => useNotificationMutation(markNotificationRead);
export const useMarkAllRead = () => useNotificationMutation(markAllNotificationsRead);
