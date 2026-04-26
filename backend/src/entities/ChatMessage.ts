import { randomUUID } from "node:crypto";
import { ApiError } from "../utils/ApiError";

export interface ChatMessageProps {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateMessageInput {
  sessionId: string;
  senderId: string;
  content: string;
}

export interface MessageResponse {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export class ChatMessage {
  public readonly id: string;
  public readonly sessionId: string;
  public readonly senderId: string;
  public content: string;
  public isRead: boolean;
  public readonly createdAt: Date;

  constructor(props: ChatMessageProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.senderId = props.senderId;
    this.content = props.content;
    this.isRead = props.isRead;
    this.createdAt = props.createdAt;
  }

  public static create(input: CreateMessageInput): ChatMessage {
    if (!input.content || input.content.trim().length === 0) {
      throw ApiError.badRequest("Message content cannot be empty");
    }
    if (input.content.length > 5000) {
      throw ApiError.badRequest("Message cannot exceed 5000 characters");
    }
    return new ChatMessage({
      id: randomUUID(),
      sessionId: input.sessionId,
      senderId: input.senderId,
      content: input.content.trim(),
      isRead: false,
      createdAt: new Date(),
    });
  }

  public static fromPersistence(record: any): ChatMessage {
    return new ChatMessage({
      id: record.id,
      sessionId: record.sessionId,
      senderId: record.senderId,
      content: record.content,
      isRead: record.isRead,
      createdAt: record.createdAt,
    });
  }

  public markAsRead(): void {
    this.isRead = true;
  }

  public toResponse(): MessageResponse {
    return {
      id: this.id,
      sessionId: this.sessionId,
      senderId: this.senderId,
      content: this.content,
      isRead: this.isRead,
      createdAt: this.createdAt,
    };
  }
}
