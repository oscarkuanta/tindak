let io = null;

export const userRoom = (userId) => `user:${userId}`;
export const boardRoom = (slug) => `board:${slug}`;
export const reportRoom = (reportId) => `report:${reportId}`;

export function setRealtimeServer(server) {
  io = server;
}

export function getRealtimeServer() {
  return io;
}

export function emitToRooms(rooms, event, payload) {
  const targets = [...new Set(rooms.filter(Boolean))];
  if (!io || targets.length === 0) return;
  io.to(targets).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  emitToRooms(userIds.map(userRoom), event, payload);
}
