import { type Request, type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { chatService } from "../services/chat.service";

export class ChatController {
  public async getHistory(req: Request, res: Response) {
    const query = req.query as { page?: string; limit?: string };
    const data = await chatService.getHistory(req.user!.id, req.params.sessionId as string, {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    return ApiResponse.success(res, 200, "Chat history fetched", data);
  }

  public async sendMessage(req: Request, res: Response) {
    const body = req.body as { content: string };
    const data = await chatService.sendMessage(req.user!.id, req.params.sessionId as string, {
      content: body.content,
    });
    return ApiResponse.success(res, 201, "Message sent", data);
  }

  public async markRead(req: Request, res: Response) {
    const data = await chatService.markAllRead(req.user!.id, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Messages marked as read", data);
  }

  public async getUnreadCount(req: Request, res: Response) {
    const data = await chatService.getUnreadCount(req.user!.id, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Unread count fetched", data);
  }
}

export const chatController = new ChatController();
