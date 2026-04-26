import { type Request, type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { sessionService } from "../services/session.service";
import { SessionType } from "../entities/Session";

export class SessionController {
  public async book(req: Request, res: Response) {
    const body = req.body as { therapistId: string; slotId: string; type: SessionType };
    const data = await sessionService.book(req.user!.id, req.user!.role, body);
    return ApiResponse.success(res, 201, "Session booked successfully", data);
  }

  public async getById(req: Request, res: Response) {
    const data = await sessionService.getById(req.user!.id, req.user!.role, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Session fetched", data);
  }

  public async confirm(req: Request, res: Response) {
    const data = await sessionService.confirm(req.user!.id, req.user!.role, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Session confirmed", data);
  }

  public async start(req: Request, res: Response) {
    const data = await sessionService.start(req.user!.id, req.user!.role, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Session started", data);
  }

  public async complete(req: Request, res: Response) {
    const data = await sessionService.complete(req.user!.id, req.user!.role, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Session completed", data);
  }

  public async cancel(req: Request, res: Response) {
    const body = req.body as { reason: string };
    const data = await sessionService.cancel(
      req.user!.id,
      req.user!.role,
      req.params.sessionId as string,
      body.reason ?? "No reason provided",
    );
    return ApiResponse.success(res, 200, "Session cancelled", data);
  }

  public async reschedule(req: Request, res: Response) {
    const body = req.body as { newScheduledAt: string };
    const data = await sessionService.reschedule(
      req.user!.id,
      req.user!.role,
      req.params.sessionId as string,
      { newScheduledAt: new Date(body.newScheduledAt) },
    );
    return ApiResponse.success(res, 200, "Session rescheduled", data);
  }

  public async addNotes(req: Request, res: Response) {
    const body = req.body as { notes: string };
    const data = await sessionService.addNotes(
      req.user!.id,
      req.user!.role,
      req.params.sessionId as string,
      body.notes,
    );
    return ApiResponse.success(res, 200, "Session notes saved", data);
  }

  public async getNotes(req: Request, res: Response) {
    const data = await sessionService.getNotes(req.user!.id, req.user!.role, req.params.sessionId as string);
    return ApiResponse.success(res, 200, "Session notes fetched", data);
  }

  public async getHistory(req: Request, res: Response) {
    const query = req.query as { status?: string; page?: string; limit?: string };
    const data = await sessionService.getHistory(req.user!.id, req.user!.role, {
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    return ApiResponse.success(res, 200, "Session history fetched", data);
  }
}

export const sessionController = new SessionController();
