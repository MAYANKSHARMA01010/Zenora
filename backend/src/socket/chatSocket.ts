import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { AuthUtils } from "../utils/AuthUtils";
import { chatService } from "../services/chat.service";
import { sessionRepository } from "../repositories/SessionRepository";
import { LoggerService } from "../utils/logger";

export const SOCKET_EVENTS = {
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  SEND_MESSAGE: "send_message",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  READ_RECEIPT: "read_receipt",
  RECEIVE_MESSAGE: "receive_message",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  TYPING_INDICATOR: "typing_indicator",
  MESSAGES_READ: "messages_read",
  ERROR: "socket_error",
  SESSION_STATUS_CHANGED: "session_status_changed",
} as const;

interface JoinRoomPayload { sessionId: string }
interface SendMessagePayload { sessionId: string; content: string }
interface ReadReceiptPayload { sessionId: string }
interface TypingPayload { sessionId: string }

export class ChatSocketHandler {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    });

    this.attachAuthMiddleware();
    this.attachConnectionHandler();
  }

  private attachAuthMiddleware(): void {
    this.io.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication token missing"));

      try {
        const decoded = AuthUtils.verifyToken(token);
        (socket as any).user = { id: decoded.id, role: decoded.role };
        next();
      } catch {
        next(new Error("Invalid or expired token"));
      }
    });
  }

  private attachConnectionHandler(): void {
    this.io.on("connection", (socket: Socket) => {
      const user = (socket as any).user as { id: string; role: string };
      LoggerService.info(`[Socket] User ${user.id} connected — ${socket.id}`);

      socket.on(SOCKET_EVENTS.JOIN_ROOM, (p: JoinRoomPayload) => this.handleJoinRoom(socket, user, p));
      socket.on(SOCKET_EVENTS.LEAVE_ROOM, (p: JoinRoomPayload) => this.handleLeaveRoom(socket, user, p));
      socket.on(SOCKET_EVENTS.SEND_MESSAGE, (p: SendMessagePayload) => this.handleSendMessage(socket, user, p));
      socket.on(SOCKET_EVENTS.TYPING_START, (p: TypingPayload) => this.handleTyping(socket, user, p, true));
      socket.on(SOCKET_EVENTS.TYPING_STOP, (p: TypingPayload) => this.handleTyping(socket, user, p, false));
      socket.on(SOCKET_EVENTS.READ_RECEIPT, (p: ReadReceiptPayload) => this.handleReadReceipt(socket, user, p));
      socket.on("disconnect", () => LoggerService.info(`[Socket] User ${user.id} disconnected`));
    });
  }

  private async handleJoinRoom(
    socket: Socket,
    user: { id: string; role: string },
    payload: JoinRoomPayload,
  ) {
    try {
      const session = await sessionRepository.findById(payload.sessionId);
      if (!session) return this.emitError(socket, "Session not found");

      const isParticipant = session.isOwnedByClient(user.id) || session.isOwnedByTherapist(user.id);
      if (!isParticipant) return this.emitError(socket, "Not a participant");

      if (!session.canChat()) {
        return this.emitError(socket, `Chat unavailable — session is ${session.status}`);
      }

      const room = this.roomName(payload.sessionId);
      await socket.join(room);
      socket.to(room).emit(SOCKET_EVENTS.USER_JOINED, { userId: user.id, sessionId: payload.sessionId });
    } catch {
      this.emitError(socket, "Failed to join room");
    }
  }

  private async handleLeaveRoom(
    socket: Socket,
    user: { id: string; role: string },
    payload: JoinRoomPayload,
  ) {
    const room = this.roomName(payload.sessionId);
    await socket.leave(room);
    socket.to(room).emit(SOCKET_EVENTS.USER_LEFT, { userId: user.id, sessionId: payload.sessionId });
  }

  private async handleSendMessage(
    socket: Socket,
    user: { id: string; role: string },
    payload: SendMessagePayload,
  ) {
    try {
      const message = await chatService.persistSocketMessage(user.id, payload.sessionId, payload.content);
      this.io.to(this.roomName(payload.sessionId)).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, message.toResponse());
    } catch (err: any) {
      this.emitError(socket, err.message ?? "Failed to send message");
    }
  }

  private handleTyping(
    socket: Socket,
    user: { id: string; role: string },
    payload: TypingPayload,
    isTyping: boolean,
  ) {
    socket.to(this.roomName(payload.sessionId)).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
      userId: user.id,
      sessionId: payload.sessionId,
      isTyping,
    });
  }

  private async handleReadReceipt(
    socket: Socket,
    user: { id: string; role: string },
    payload: ReadReceiptPayload,
  ) {
    try {
      await chatService.handleReadReceipt(user.id, payload.sessionId);
      socket.to(this.roomName(payload.sessionId)).emit(SOCKET_EVENTS.MESSAGES_READ, {
        sessionId: payload.sessionId,
        readBy: user.id,
        readAt: new Date().toISOString(),
      });
    } catch {
      this.emitError(socket, "Failed to process read receipt");
    }
  }

  public broadcastSessionStatusChange(sessionId: string, newStatus: string) {
    this.io.to(this.roomName(sessionId)).emit(SOCKET_EVENTS.SESSION_STATUS_CHANGED, {
      sessionId,
      status: newStatus,
    });
  }

  private roomName(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private emitError(socket: Socket, message: string) {
    socket.emit(SOCKET_EVENTS.ERROR, { message });
  }

  public get socketServer() {
    return this.io;
  }
}
