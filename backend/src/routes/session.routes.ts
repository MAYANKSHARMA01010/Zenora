import { Router } from "express";
import { Routes } from "../interfaces/route.interface";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { AsyncUtils } from "../utils/asyncHandler";
import { sessionController } from "../controllers/session.controller";
import { chatController } from "../controllers/chat.controller";
import { Role } from "../constants/roles";

export default class SessionRoutes implements Routes {
  public path = "/api/v1";
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // /sessions routes
    this.router.post(
      "/sessions",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT),
      AsyncUtils.wrap(sessionController.book.bind(sessionController)),
    );

    // history must come before /:sessionId to avoid being swallowed by the param route
    this.router.get(
      "/sessions/history",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(sessionController.getHistory.bind(sessionController)),
    );

    this.router.get(
      "/sessions/:sessionId",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST, Role.ADMIN),
      AsyncUtils.wrap(sessionController.getById.bind(sessionController)),
    );

    this.router.patch(
      "/sessions/:sessionId/confirm",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.THERAPIST),
      AsyncUtils.wrap(sessionController.confirm.bind(sessionController)),
    );

    this.router.patch(
      "/sessions/:sessionId/start",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.THERAPIST),
      AsyncUtils.wrap(sessionController.start.bind(sessionController)),
    );

    this.router.patch(
      "/sessions/:sessionId/complete",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.THERAPIST),
      AsyncUtils.wrap(sessionController.complete.bind(sessionController)),
    );

    this.router.patch(
      "/sessions/:sessionId/cancel",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(sessionController.cancel.bind(sessionController)),
    );

    this.router.patch(
      "/sessions/:sessionId/reschedule",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT),
      AsyncUtils.wrap(sessionController.reschedule.bind(sessionController)),
    );

    this.router.post(
      "/sessions/:sessionId/notes",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.THERAPIST),
      AsyncUtils.wrap(sessionController.addNotes.bind(sessionController)),
    );

    this.router.get(
      "/sessions/:sessionId/notes",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(sessionController.getNotes.bind(sessionController)),
    );

    // chat routes nested under sessions
    this.router.get(
      "/sessions/:sessionId/chat/history",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(chatController.getHistory.bind(chatController)),
    );

    this.router.post(
      "/sessions/:sessionId/chat/messages",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(chatController.sendMessage.bind(chatController)),
    );

    this.router.patch(
      "/sessions/:sessionId/chat/read",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(chatController.markRead.bind(chatController)),
    );

    this.router.get(
      "/sessions/:sessionId/chat/unread",
      AuthMiddleware.authenticate,
      AuthMiddleware.authorize(Role.CLIENT, Role.THERAPIST),
      AsyncUtils.wrap(chatController.getUnreadCount.bind(chatController)),
    );
  }
}
