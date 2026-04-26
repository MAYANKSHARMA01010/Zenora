import { type Request, type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { authService } from "../services/auth.service";
import { Role } from "../constants/roles";
import { OnboardingProfile } from "../entities/User";

export class AuthController {
  public async register(req: Request, res: Response) {
    const body = req.body as {
      name: string;
      email: string;
      password: string;
      role: Role;
      phone?: string;
    };

    const data = await authService.register({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
      phone: body.phone,
    });

    return ApiResponse.success(res, 201, "Registration successful", data);
  }

  public async login(req: Request, res: Response) {
    const body = req.body as { email: string; password: string; role: Role };
    const data = await authService.login(body);
    return ApiResponse.success(res, 200, "Authentication successful", data);
  }

  public async refresh(req: Request, res: Response) {
    const body = req.body as { refreshToken: string };
    const data = await authService.refresh(body.refreshToken);
    return ApiResponse.success(res, 200, "Token refreshed", data);
  }

  public async logout(req: Request, res: Response) {
    const body = req.body as { refreshToken?: string };
    await authService.logout(body.refreshToken);
    return ApiResponse.success(res, 200, "Logout successful", null);
  }

  public async forgotPassword(req: Request, res: Response) {
    const body = req.body as { email: string };
    const result = await authService.forgotPassword(body.email);
    return ApiResponse.success(res, 200, result.message, result.data);
  }

  public async resetPassword(req: Request, res: Response) {
    const body = req.body as { token: string; newPassword: string };
    await authService.resetPassword(body.token, body.newPassword);
    return ApiResponse.success(res, 200, "Password reset successfully", null);
  }

  public async changePassword(req: Request, res: Response) {
    const body = req.body as { currentPassword: string; newPassword: string };
    await authService.changePassword(req.user!.id, body);
    return ApiResponse.success(res, 200, "Password changed successfully", null);
  }

  public async sendEmailVerification(req: Request, res: Response) {
    const result = await authService.sendEmailVerification(req.user!.id);
    return ApiResponse.success(res, 200, result.message, result.data);
  }

  public async verifyEmail(req: Request, res: Response) {
    const body = req.body as { token: string };
    const data = await authService.verifyEmail(body.token);
    return ApiResponse.success(res, 200, "Email verified successfully", data);
  }

  public async me(req: Request, res: Response) {
    const data = await authService.me(req.user!.id);
    return ApiResponse.success(res, 200, "Current user fetched successfully", data);
  }

  public async onboardingStatus(req: Request, res: Response) {
    const data = await authService.getOnboardingStatus(req.user!.id);
    return ApiResponse.success(res, 200, "Onboarding status fetched successfully", data);
  }

  public async completeOnboarding(req: Request, res: Response) {
    const body = req.body as OnboardingProfile;
    const data = await authService.completeOnboarding(req.user!.id, body);
    return ApiResponse.success(res, 200, "Onboarding completed successfully", data);
  }

  public async googleStart(req: Request, res: Response) {
    const result = await authService.startGoogleAuth(req.query.role as string | undefined);
    return res.redirect(result.redirectUrl);
  }

  public async googleCallback(req: Request, res: Response) {
    const result = await authService.handleGoogleCallback(
      req.query.code as string | undefined,
      req.query.state as string | undefined,
    );
    return res.redirect(result.redirectUrl);
  }
}

export const authController = new AuthController();
