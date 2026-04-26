import { Router } from "express";
import { AsyncUtils } from "../utils/asyncHandler";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { ValidationMiddleware } from "../middlewares/validate";
import { authController } from "../controllers/auth.controller";
import { Routes } from "../interfaces/route.interface";
import {
  changePasswordSchema,
  completeOnboardingSchema,
  forgotPasswordSchema,
  googleStartSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sendEmailVerificationSchema,
  verifyEmailSchema,
} from "../validators/auth.validation";

export default class AuthRoutes implements Routes {
  public path = "/api/v1/auth";
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Google OAuth
    this.router.get(
      "/google/start",
      ValidationMiddleware.validate(googleStartSchema),
      AsyncUtils.wrap(authController.googleStart.bind(authController)),
    );
    this.router.get(
      "/google/callback",
      AsyncUtils.wrap(authController.googleCallback.bind(authController)),
    );

    // Public auth
    this.router.post(
      "/register",
      ValidationMiddleware.validate(registerSchema),
      AsyncUtils.wrap(authController.register.bind(authController)),
    );

    this.router.post(
      "/login",
      ValidationMiddleware.validate(loginSchema),
      AsyncUtils.wrap(authController.login.bind(authController)),
    );

    this.router.post(
      "/refresh",
      ValidationMiddleware.validate(refreshSchema),
      AsyncUtils.wrap(authController.refresh.bind(authController)),
    );

    this.router.post(
      "/logout",
      ValidationMiddleware.validate(logoutSchema),
      AsyncUtils.wrap(authController.logout.bind(authController)),
    );

    // Password reset
    this.router.post(
      "/forgot-password",
      ValidationMiddleware.validate(forgotPasswordSchema),
      AsyncUtils.wrap(authController.forgotPassword.bind(authController)),
    );
    this.router.post(
      "/reset-password",
      ValidationMiddleware.validate(resetPasswordSchema),
      AsyncUtils.wrap(authController.resetPassword.bind(authController)),
    );

    // Email verification
    this.router.post(
      "/email/verify",
      ValidationMiddleware.validate(verifyEmailSchema),
      AsyncUtils.wrap(authController.verifyEmail.bind(authController)),
    );
    this.router.post(
      "/email/send-verification",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(sendEmailVerificationSchema),
      AsyncUtils.wrap(authController.sendEmailVerification.bind(authController)),
    );

    // Authenticated routes
    this.router.post(
      "/change-password",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(changePasswordSchema),
      AsyncUtils.wrap(authController.changePassword.bind(authController)),
    );

    this.router.get(
      "/me",
      AuthMiddleware.authenticate,
      AsyncUtils.wrap(authController.me.bind(authController)),
    );

    this.router.get(
      "/onboarding/status",
      AuthMiddleware.authenticate,
      AsyncUtils.wrap(authController.onboardingStatus.bind(authController)),
    );

    this.router.put(
      "/onboarding",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(completeOnboardingSchema),
      AsyncUtils.wrap(authController.completeOnboarding.bind(authController)),
    );
  }
}
