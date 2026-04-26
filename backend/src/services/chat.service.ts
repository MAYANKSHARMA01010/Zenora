import { ChatMessage } from "../entities/ChatMessage";
import {
  ChatMessageRepository,
  chatMessageRepository,
} from "../repositories/ChatMessageRepository";
import { SessionRepository, sessionRepository } from "../repositories/SessionRepository";
import { ApiError } from "../utils/ApiError";

export interface SendMessagePayload {
  content: string;
}

export class ChatService {
  constructor(
    private readonly messages: ChatMessageRepository = chatMessageRepository,
    private readonly sessions: SessionRepository = sessionRepository,
  ) {}

  public async sendMessage(userId: string, sessionId: string, payload: SendMessagePayload) {
    await this.assertParticipant(userId, sessionId);
    const message = ChatMessage.create({ sessionId, senderId: userId, content: payload.content });
    const saved = await this.messages.save(message);
    return { message: saved.toResponse() };
  }

  public async getHistory(
    userId: string,
    sessionId: string,
    opts: { page?: number; limit?: number } = {},
  ) {
    await this.assertParticipant(userId, sessionId);
    const result = await this.messages.listForSession(sessionId, opts);
    return { messages: result.messages.map((m) => m.toResponse()), total: result.total };
  }

  public async markAllRead(userId: string, sessionId: string) {
    await this.assertParticipant(userId, sessionId);
    await this.messages.markSessionMessagesRead(sessionId, userId);
    return { sessionId, markedReadBy: userId };
  }

  public async getUnreadCount(userId: string, sessionId: string) {
    await this.assertParticipant(userId, sessionId);
    const count = await this.messages.countUnread(sessionId, userId);
    return { sessionId, unreadCount: count };
  }

  // called directly from the socket layer, skips participant check since auth is done at socket handshake
  public async persistSocketMessage(
    senderId: string,
    sessionId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message = ChatMessage.create({ sessionId, senderId, content });
    return this.messages.save(message);
  }

  public async handleReadReceipt(recipientId: string, sessionId: string): Promise<void> {
    await this.messages.markSessionMessagesRead(sessionId, recipientId);
  }

  private async assertParticipant(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw ApiError.notFound("Session");

    const isParticipant =
      session.isOwnedByClient(userId) || session.isOwnedByTherapist(userId);
    if (!isParticipant) throw ApiError.forbidden("You are not a participant of this session");

    if (!session.canChat()) {
      throw ApiError.badRequest(
        `Chat is only available for CONFIRMED or ONGOING sessions. Current status: ${session.status}`,
      );
    }
  }
}

export const chatService = new ChatService();
