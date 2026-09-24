import type { Server as SocketIOServer } from "socket.io";

// Toegang tot de Socket.io-server voor code buiten gameServer.ts (bv.
// notify.ts), zonder die hele module te importeren. Alleen gevuld in de
// instantie waar de socketserver echt draait (server.ts); in Next's eigen
// bundel (API-routes) is dit null en doet emitToUser niets — de client haalt
// het daar zelf op (zie NotificationCenter.tsx).
let io: SocketIOServer | null = null;

export function setRealtimeServer(server: SocketIOServer): void {
  io = server;
}

export function emitToUser(userId: string, event: string, payload?: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
