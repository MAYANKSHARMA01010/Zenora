import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { DatabaseService } from "../config/database";
import { env } from "../config/env";
import { Role } from "../constants/roles";
import { ApiError } from "../utils/ApiError";
import { AuthUtils } from "../utils/AuthUtils";

export type AuthUserResponse = {
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

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export class AuthService {
  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private parseRole(role?: string): Role | undefined {
    if (role === Role.CLIENT || role === Role.THERAPIST || role === Role.ADMIN) {
      return role;
    }

    return undefined;
  }

  private getGoogleOAuthConfig() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      throw ApiError.badRequest("Google OAuth is not configured");
    }

    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    };
  }

  private getFrontendRedirectBase() {
    return env.NODE_ENV === "production"
      ? env.FRONTEND_SERVER_URL || env.FRONTEND_LOCAL_URL
      : env.FRONTEND_LOCAL_URL;
  }

  private buildUserResponse(user: AuthUserRecord): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    };
  }

  private issueTokens(user: AuthUserRecord): TokenPair {
    return AuthUtils.generateTokens({
      id: user.id,
      role: user.role as Role,
      isActive: user.isActive,
    });
  }

  private async ensureRoleProfile(userId: string, role: Role) {
    const db = await DatabaseService.getInstance();

    if (role === Role.CLIENT) {
      await db.client.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });
    }

    if (role === Role.ADMIN) {
      await db.admin.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });
    }
  }

  public async startGoogleAuth(rawRole?: string) {
    const role = this.parseRole(rawRole);

    if (!role) {
      throw ApiError.badRequest("Valid role is required for Google login");
    }

    const googleConfig = this.getGoogleOAuthConfig();
    const state = AuthUtils.generateGoogleOAuthState(role);
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authUrl.searchParams.set("client_id", googleConfig.clientId);
    authUrl.searchParams.set("redirect_uri", googleConfig.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("access_type", "offline");

    return { redirectUrl: authUrl.toString() };
  }

  public async handleGoogleCallback(code?: string, state?: string) {
    if (!code || !state) {
      throw ApiError.badRequest("Google callback is missing code or state");
    }

    let statePayload;
    try {
      statePayload = AuthUtils.verifyGoogleOAuthState(state);
    } catch {
      throw ApiError.unauthorized("Invalid OAuth state");
    }

    const googleConfig = this.getGoogleOAuthConfig();
    const oauth2Client = new OAuth2Client(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.id_token) {
      throw ApiError.unauthorized("Google ID token is missing");
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleConfig.clientId,
    });

    const googleUser = ticket.getPayload();

    if (!googleUser?.email || !googleUser.email_verified) {
      throw ApiError.unauthorized("Google account email is not verified");
    }

    const db = await DatabaseService.getInstance();
    const email = this.normalizeEmail(googleUser.email);

    let user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          name: googleUser.name || email.split("@")[0],
          email,
          passwordHash: await AuthUtils.hashPassword(randomUUID()),
          role: statePayload.role,
          isEmailVerified: true,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      await this.ensureRoleProfile(user.id, statePayload.role);
    } else if (user.role !== statePayload.role) {
      throw ApiError.unauthorized("Selected role does not match your account");
    }

    const tokensPair = this.issueTokens(user);
    const frontendUrl = new URL(`${this.getFrontendRedirectBase()}/login`);
    frontendUrl.hash = new URLSearchParams({
      accessToken: tokensPair.accessToken,
      refreshToken: tokensPair.refreshToken,
      user: JSON.stringify(this.buildUserResponse(user)),
    }).toString();

    return { redirectUrl: frontendUrl.toString() };
  }

  public async login(payload: { email?: string; password?: string; role?: string }) {
    const { email, password, role } = payload;

    if (!email || !password) {
      throw ApiError.badRequest("Email and password are required");
    }

    const selectedRole = this.parseRole(role);
    if (!selectedRole) {
      throw ApiError.badRequest("Valid role is required");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: { id: true, name: true, email: true, role: true, passwordHash: true, isActive: true },
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw ApiError.unauthorized("User account is inactive");
    }

    if (selectedRole !== user.role) {
      throw ApiError.unauthorized("Selected role does not match your account");
    }

    const isPasswordValid = await AuthUtils.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const tokensPair = this.issueTokens(user);

    return {
      user: this.buildUserResponse(user),
      ...tokensPair,
    };
  }

  public async refresh(refreshToken?: string) {
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

    const tokensPair = this.issueTokens(user);

    return {
      user: this.buildUserResponse(user),
      ...tokensPair,
    };
  }

  public async forgotPassword(email?: string) {
    if (!email) {
      throw ApiError.badRequest("Email is required");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: { id: true, email: true },
    });

    if (!user) {
      return {
        message: "If this email exists, password reset instructions have been sent",
        data: { resetToken: null as string | null },
      };
    }

    const resetToken = AuthUtils.generatePasswordResetToken({
      id: user.id,
      email: user.email,
    });

    return {
      message: "Password reset token generated",
      data: {
        resetToken: env.NODE_ENV === "development" ? resetToken : null,
      },
    };
  }

  public async resetPassword(token?: string, newPassword?: string) {
    if (!token || !newPassword) {
      throw ApiError.badRequest("Reset token and new password are required");
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest("New password must be at least 6 characters");
    }

    const decoded = AuthUtils.verifyPasswordResetToken(token);
    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({ where: { id: decoded.id } });

    if (!user || this.normalizeEmail(user.email) !== this.normalizeEmail(decoded.email)) {
      throw ApiError.unauthorized("Invalid or expired reset token");
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await AuthUtils.hashPassword(newPassword) },
    });
  }

  public async changePassword(userId: string, payload: { currentPassword?: string; newPassword?: string }) {
    const { currentPassword, newPassword } = payload;

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest("Current password and new password are required");
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest("New password must be at least 6 characters");
    }

    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: userId },
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
      data: { passwordHash: await AuthUtils.hashPassword(newPassword) },
    });
  }

  public async me(userId: string) {
    const db = await DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    return { user: this.buildUserResponse(user) };
  }
}

export const authService = new AuthService();
