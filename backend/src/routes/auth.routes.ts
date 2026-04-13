import { Router } from "express";
import { AsyncUtils } from "../utils/asyncHandler";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { authController } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.get("/google/start", AsyncUtils.wrap(authController.googleStart.bind(authController)));
authRouter.get("/google/callback", AsyncUtils.wrap(authController.googleCallback.bind(authController)));

authRouter.post("/login", AsyncUtils.wrap(authController.login.bind(authController)));
authRouter.post("/refresh", AsyncUtils.wrap(authController.refresh.bind(authController)));
authRouter.post("/logout", AsyncUtils.wrap(authController.logout.bind(authController)));

authRouter.post("/forgot-password", AsyncUtils.wrap(authController.forgotPassword.bind(authController)));
authRouter.post("/reset-password", AsyncUtils.wrap(authController.resetPassword.bind(authController)));

authRouter.post(
  "/change-password",
  AuthMiddleware.authenticate,
  AsyncUtils.wrap(authController.changePassword.bind(authController)),
);

authRouter.get(
  "/me",
  AuthMiddleware.authenticate,
  AsyncUtils.wrap(authController.me.bind(authController)),
);

export { authRouter };
