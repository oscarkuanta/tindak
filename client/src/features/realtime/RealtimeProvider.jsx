import { useEffect, useMemo, useRef } from 'react';
import { Outlet } from 'react-router';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@tindak/shared';
import { useMe } from '../auth/hooks.js';
import { useToast } from '../boards/toastContext.js';
import { notificationText } from '../notifications/notificationText.js';
import { SocketContext } from './socketContext.js';
import {
  applyBoardUpdated,
  applyNotification,
  applyQueueUpdated,
  applyReportCreated,
  applyReportUpdated,
} from './cacheUpdates.js';

function createClient() {
  let socket = null;
  const subscriptions = new Map();

  function join(entry) {
    socket?.emit(entry.join, entry.payload);
  }

  return {
    connect(handlers) {
      socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });
      socket.on('connect', () => subscriptions.forEach(join));
      for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    },
    disconnect() {
      socket?.disconnect();
      socket = null;
    },
    subscribe(joinEvent, leaveEvent, payload) {
      const key = `${joinEvent}:${JSON.stringify(payload)}`;
      const entry = { join: joinEvent, payload };
      subscriptions.set(key, entry);
      if (socket?.connected) join(entry);
      return () => {
        subscriptions.delete(key);
        socket?.emit(leaveEvent, payload);
      };
    },
  };
}

export function RealtimeProvider({ children }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: user, isPending } = useMe();
  const client = useMemo(() => createClient(), []);
  const toastRef = useRef(showToast);
  const userId = user?.id ?? null;

  useEffect(() => {
    toastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (isPending) return undefined;
    client.connect({
      [SOCKET_EVENTS.REPORT_UPDATED]: (payload) => applyReportUpdated(queryClient, payload),
      [SOCKET_EVENTS.REPORT_CREATED]: (payload) => applyReportCreated(queryClient, payload),
      [SOCKET_EVENTS.QUEUE_UPDATED]: (payload) => applyQueueUpdated(queryClient, payload),
      [SOCKET_EVENTS.BOARD_UPDATED]: (payload) => applyBoardUpdated(queryClient, payload),
      [SOCKET_EVENTS.NOTIFICATION_NEW]: (notification) => {
        applyNotification(queryClient);
        toastRef.current(notificationText(notification));
      },
    });
    return () => client.disconnect();
  }, [client, queryClient, isPending, userId]);

  return <SocketContext.Provider value={client}>{children ?? <Outlet />}</SocketContext.Provider>;
}
