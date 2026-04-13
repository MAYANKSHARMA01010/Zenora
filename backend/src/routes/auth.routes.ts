import { Router, type Request, type Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { AsyncUtils } from "../utils/asyncHandler";
import { DatabaseService } from "../config/database";
import { AuthUtils } from "../utils/AuthUtils";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { Role } from "../constants/roles";

const authRouter = Router();

type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseRole(role?: string): Role | undefined {
  if (role === Role.CLIENT || role === Role.THERAPIST || role === Role.ADMIN) {
    return role;
  }

  return undefined;
}

function buildUserResponse(user: AuthUserRecord): AuthUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
}

async function issueAuthResponse(user: AuthUserRecord, res: Response) {
  const tokens = AuthUtils.generateTokens({
    id: user.id,
    role: user.role as Role,
    isActive: user.isActive,
  });

  return ApiResponse.success(res, 200, "Authentication successful", {
    user: buildUserResponse(user),
    ...tokens,
  });
}

authRouter.post(
  "/login",
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const { email, password, role } = req.body as {
      email?: string;
      password?: string;
      role?: string;
    };

    if (!email || !password) {
      throw ApiError.badRequest("Email and password are required");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, name: true, email: true, role: true, passwordHash: true, isActive: true },
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw ApiError.unauthorized("User account is inactive");
    }

    if (role) {
      const selectedRole = parseRole(role);
      if (!selectedRole) {
        throw ApiError.badRequest("Invalid role selected");
      }

      if (selectedRole !== user.role) {
        throw ApiError.unauthorized("Selected role does not match your account");
      }
    }

    const isPasswordValid = await AuthUtils.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    return issueAuthResponse(user, res);
  }),
);

authRouter.post(
  "/refresh",
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      throw ApiError.badRequest("Refresh token is required");
    }

    const decoded = AuthUtils.verifyRefreshToken(refreshToken);
    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    if (!user.isActive) {
      throw ApiError.unauthorized("User account is inactive");
    }

    return issueAuthResponse(user, res);
  }),
);

authRouter.post(
  "/logout",
  AsyncUtils.wrap(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, 200, "Logout successful", null);
  }),
);

authRouter.post(
  "/forgot-password",
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    if (!email) {
      throw ApiError.badRequest("Email is required");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, email: true },
    });

    if (!user) {
      return ApiResponse.success(res, 200, "If this email exists, password reset instructions have been sent", {
        resetToken: null,
      });
    }

    const resetToken = AuthUtils.generatePasswordResetToken({
      id: user.id,
      email: user.email,
    });

    return ApiResponse.success(res, 200, "Password reset token generated", {
      resetToken,
    });
  }),
);

authRouter.post(
  "/reset-password",
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
      throw ApiError.badRequest("Reset token and new password are required");
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest("New password must be at least 6 characters");
    }

    const decoded = AuthUtils.verifyPasswordResetToken(token);
    const db = await DatabaseService.getInstance();

    const user = await db.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || normalizeEmail(user.email) !== normalizeEmail(decoded.email)) {
      throw ApiError.unauthorized("Invalid or expired reset token");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await AuthUtils.hashPassword(newPassword),
      },
    });

    return ApiResponse.success(res, 200, "Password reset successfully", null);
  }),
);

authRouter.post(
  "/change-password",
  AuthMiddleware.authenticate,
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest("Current password and new password are required");
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest("New password must be at least 6 characters");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    const isPasswordValid = await AuthUtils.comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Current password is incorrect");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await AuthUtils.hashPassword(newPassword),
      },
    });

    return ApiResponse.success(res, 200, "Password changed successfully", null);
  }),
);

authRouter.get(
  "/me",
  AuthMiddleware.authenticate,
  AsyncUtils.wrap(async (req: Request, res: Response) => {
    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    return ApiResponse.success(res, 200, "Current user fetched successfully", {
      user: buildUserResponse(user),
    });
  }),
);

export { authRouter };
