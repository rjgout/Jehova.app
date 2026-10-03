import type { Server as SocketIOServer } from "socket.io";

// Next kan API-routes in een andere modulebundel laden dan gameServer.ts.
// globalThis zorgt dat beide bundels binnen hetzelfde Node-proces dezelfde
// Socket.io-server zien, zonder de eager-importketen van server.ts uit te
// breiden. Over meerdere instanties verspreidt de Redis-adapter de room-emit.
const realtimeGlobal = globalThis as typeof globalThis & {
  __versadoRealtimeServer?: SocketIOServer;
};

export function setRealtimeServer(server: SocketIOServer): void {
  realtimeGlobal.__versadoRealtimeServer = server;
}

export function emitToUser(userId: string, event: string, payload?: unknown): void {
  realtimeGlobal.__versadoRealtimeServer?.to(`user:${userId}`).emit(event, payload);
}
