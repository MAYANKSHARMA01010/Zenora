import { type Request, type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { authService } from "../services/auth.service";

export class AuthController {
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

  public async login(req: Request, res: Response) {
    const data = await authService.login(req.body);
    return ApiResponse.success(res, 200, "Authentication successful", data);
  }

  public async refresh(req: Request, res: Response) {
    const data = await authService.refresh((req.body as { refreshToken?: string }).refreshToken);
    return ApiResponse.success(res, 200, "Authentication successful", data);
  }

  public async logout(_req: Request, res: Response) {
    return ApiResponse.success(res, 200, "Logout successful", null);
  }

  public async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword((req.body as { email?: string }).email);
    return ApiResponse.success(res, 200, result.message, result.data);
  }

  public async resetPassword(req: Request, res: Response) {
    const body = req.body as { token?: string; newPassword?: string };
    await authService.resetPassword(body.token, body.newPassword);
    return ApiResponse.success(res, 200, "Password reset successfully", null);
  }

  public async changePassword(req: Request, res: Response) {
    const body = req.body as { currentPassword?: string; newPassword?: string };
    await authService.changePassword(req.user!.id, body);
    return ApiResponse.success(res, 200, "Password changed successfully", null);
  }

  public async me(req: Request, res: Response) {
    const data = await authService.me(req.user!.id);
    return ApiResponse.success(res, 200, "Current user fetched successfully", data);
  }
}

export const authController = new AuthController();
