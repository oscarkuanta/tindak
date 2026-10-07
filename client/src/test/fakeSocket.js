const sockets = [];

export function createFakeSocket() {
  const handlers = new Map();
  const socket = {
    connected: true,
    emitted: [],
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(handler);
      if (event === 'connect') queueMicrotask(handler);
      return socket;
    },
    emit(event, ...args) {
      socket.emitted.push([event, ...args]);
      return socket;
    },
    disconnect() {
      socket.connected = false;
    },
    receive(event, payload) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
  sockets.push(socket);
  return socket;
}

export function activeSocket() {
  return sockets.filter((socket) => socket.connected).at(-1);
}

export function resetSockets() {
  sockets.length = 0;
}
