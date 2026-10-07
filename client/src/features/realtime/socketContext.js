import { createContext, useContext, useEffect } from 'react';
import { SOCKET_EVENTS } from '@tindak/shared';

export const SocketContext = createContext(null);

export function useSocketClient() {
  return useContext(SocketContext);
}

export function useBoardChannel(slug) {
  const client = useSocketClient();
  useEffect(() => {
    if (!client || !slug) return undefined;
    return client.subscribe(SOCKET_EVENTS.BOARD_SUBSCRIBE, SOCKET_EVENTS.BOARD_UNSUBSCRIBE, slug);
  }, [client, slug]);
}

export function useReportChannel(id, credentials) {
  const client = useSocketClient();
  const trackingCode = credentials?.trackingCode;
  const secret = credentials?.secret;
  useEffect(() => {
    if (!client || !id) return undefined;
    return client.subscribe(SOCKET_EVENTS.REPORT_SUBSCRIBE, SOCKET_EVENTS.REPORT_UNSUBSCRIBE, {
      id: Number(id),
      ...(trackingCode && secret && { trackingCode, secret }),
    });
  }, [client, id, trackingCode, secret]);
}
