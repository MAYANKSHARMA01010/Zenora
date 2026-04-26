import { DatabaseService } from "../config/database";
import { ChatMessage } from "../entities/ChatMessage";

export class ChatMessageRepository {
  private async db() {
    return DatabaseService.getInstance();
  }

  public async save(message: ChatMessage): Promise<ChatMessage> {
    const db = await this.db();
    const record = await db.chatMessage.create({
      data: {
        id: message.id,
        sessionId: message.sessionId,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    });
    return ChatMessage.fromPersistence(record);
  }

  public async findById(id: string): Promise<ChatMessage | null> {
    const db = await this.db();
    const record = await db.chatMessage.findUnique({ where: { id } });
    return record ? ChatMessage.fromPersistence(record) : null;
  }

  public async listForSession(
    sessionId: string,
    opts: { page?: number; limit?: number } = {},
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const db = await this.db();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      db.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      db.chatMessage.count({ where: { sessionId } }),
    ]);

    return { messages: records.map(ChatMessage.fromPersistence), total };
  }

  // marks all messages in the session as read, skipping ones sent by the recipient themselves
  public async markSessionMessagesRead(
    sessionId: string,
    recipientId: string,
  ): Promise<void> {
    const db = await this.db();
    await db.chatMessage.updateMany({
      where: { sessionId, isRead: false, senderId: { not: recipientId } },
      data: { isRead: true },
    });
  }

  public async countUnread(sessionId: string, recipientId: string): Promise<number> {
    const db = await this.db();
    return db.chatMessage.count({
      where: { sessionId, isRead: false, senderId: { not: recipientId } },
    });
  }
}

export const chatMessageRepository = new ChatMessageRepository();
