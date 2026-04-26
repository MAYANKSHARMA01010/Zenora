import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "node:crypto";
import { computedEnv, env } from "../config/env";
import { Role } from "../constants/roles";
import { User, OnboardingProfile, UserResponse } from "../entities/User";
import { UserRepository, userRepository } from "../repositories/UserRepository";
import { ApiError } from "../utils/ApiError";
import { AuthUtils } from "../utils/AuthUtils";
import { TokenService } from "./token.service";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type AuthSuccess = {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
  role: Role;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export class AuthService {
  constructor(private readonly users: UserRepository = userRepository) {}

  public async register(payload: RegisterPayload): Promise<AuthSuccess> {
    if (await this.users.existsByEmail(payload.email)) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      phone: payload.phone ?? null,
    });

    await this.users.insert(user);
    await this.users.ensureRoleProfile(user.id, user.role);

    const tokens = this.issueTokens(user);
    return { user: user.toResponse(), ...tokens };
  }

  public async login(payload: LoginPayload): Promise<AuthSuccess> {
    const user = await this.users.findByEmail(payload.email);
    if (!user) throw ApiError.unauthorized("Invalid email or password");

    if (!user.isActive) throw ApiError.unauthorized("User account is inactive");

    if (!this.canLoginAs(user.role, payload.role)) {
      throw ApiError.unauthorized(
        `This account is registered as ${user.role}. Please continue as ${user.role}.`,
      );
    }

    const isPasswordValid = await user.verifyPassword(payload.password);
    if (!isPasswordValid) throw ApiError.unauthorized("Invalid email or password");

    const tokens = this.issueTokens(user);
    return { user: user.toResponse(), ...tokens };
  }

  public async refresh(refreshToken: string): Promise<AuthSuccess> {
    const isRevoked = await TokenService.isRefreshTokenRevoked(refreshToken);
    if (isRevoked) throw ApiError.unauthorized("Refresh token has been revoked");

    const decoded = AuthUtils.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(decoded.id);

    if (!user) throw ApiError.unauthorized("User no longer exists");
    if (!user.isActive) throw ApiError.unauthorized("User account is inactive");

    await TokenService.revokeRefreshToken(refreshToken);

    const tokens = this.issueTokens(user);
    return { user: user.toResponse(), ...tokens };
  }

  public async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await TokenService.revokeRefreshToken(refreshToken);
    }
  }

  public async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);

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

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const decoded = AuthUtils.verifyPasswordResetToken(token);
    const user = await this.users.findById(decoded.id);

    if (!user || User.normalizeEmail(user.email) !== User.normalizeEmail(decoded.email)) {
      throw ApiError.unauthorized("Invalid or expired reset token");
    }

    await user.setPassword(newPassword);
    await this.users.update(user);
  }

  public async changePassword(userId: string, payload: ChangePasswordPayload): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    const isPasswordValid = await user.verifyPassword(payload.currentPassword);
    if (!isPasswordValid) throw ApiError.unauthorized("Current password is incorrect");

    await user.setPassword(payload.newPassword);
    await this.users.update(user);
  }

  public async sendEmailVerification(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    if (user.isEmailVerified) {
      return { message: "Email is already verified", data: { verificationToken: null } };
    }

    const verificationToken = AuthUtils.generateEmailVerificationToken({
      id: user.id,
      email: user.email,
    });

    return {
      message: "Verification email sent",
      data: {
        verificationToken: env.NODE_ENV === "development" ? verificationToken : null,
      },
    };
  }

  public async verifyEmail(token: string): Promise<{ user: UserResponse }> {
    const decoded = AuthUtils.verifyEmailVerificationToken(token);
    const user = await this.users.findById(decoded.id);

    if (!user || User.normalizeEmail(user.email) !== User.normalizeEmail(decoded.email)) {
      throw ApiError.unauthorized("Invalid or expired verification token");
    }

    user.markEmailVerified();
    await this.users.update(user);

    return { user: user.toResponse() };
  }

  public async me(userId: string): Promise<{ user: UserResponse }> {
    const user = await this.users.findById(userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");
    return { user: user.toResponse() };
  }

  public async getOnboardingStatus(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    return {
      user: user.toResponse(),
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingProfile: user.onboardingProfile,
    };
  }

  public async completeOnboarding(userId: string, profile: OnboardingProfile) {
    const user = await this.users.findById(userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    user.completeOnboarding(profile);
    await this.users.update(user);

    return {
      user: user.toResponse(),
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingProfile: user.onboardingProfile,
    };
  }

  public async startGoogleAuth(rawRole?: string) {
    const role = this.parseRole(rawRole);
    if (!role) throw ApiError.badRequest("Valid role is required for Google login");

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

    const { tokens: googleTokens } = await oauth2Client.getToken(code);

    if (!googleTokens.id_token) {
      throw ApiError.unauthorized("Google ID token is missing");
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: googleTokens.id_token,
      audience: googleConfig.clientId,
    });

    const googleUser = ticket.getPayload();
    if (!googleUser?.email || !googleUser.email_verified) {
      throw ApiError.unauthorized("Google account email is not verified");
    }

    const email = User.normalizeEmail(googleUser.email);
    let user = await this.users.findByEmail(email);

    if (!user) {
      user = await User.create({
        name: googleUser.name || email.split("@")[0],
        email,
        password: randomUUID(),
        role: statePayload.role,
        isEmailVerified: true,
      });
      await this.users.insert(user);
      await this.users.ensureRoleProfile(user.id, user.role);
    } else if (user.role !== statePayload.role) {
      throw ApiError.unauthorized(
        `This account is registered as ${user.role}. Please continue as ${user.role}.`,
      );
    }

    const tokens = this.issueTokens(user);
    const frontendUrl = new URL(`${this.getFrontendRedirectBase()}/login`);
    frontendUrl.hash = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: JSON.stringify(user.toResponse()),
    }).toString();

    return { redirectUrl: frontendUrl.toString() };
  }

  private issueTokens(user: User): TokenPair {
    return AuthUtils.generateTokens(user.getTokenPayload());
  }

  private canLoginAs(actualRole: Role, requestedRole: Role): boolean {
    if (actualRole === requestedRole) return true;
    return (
      actualRole === Role.ADMIN &&
      (requestedRole === Role.CLIENT || requestedRole === Role.THERAPIST)
    );
  }

  private parseRole(role?: string): Role | undefined {
    if (role === Role.CLIENT || role === Role.THERAPIST || role === Role.ADMIN) {
      return role;
    }
    return undefined;
  }

  private getGoogleOAuthConfig() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !computedEnv.GOOGLE_REDIRECT_URI) {
      throw ApiError.badRequest("Google OAuth is not configured");
    }
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: computedEnv.GOOGLE_REDIRECT_URI,
    };
  }

  private getFrontendRedirectBase(): string {
    return env.NODE_ENV === "production"
      ? env.FRONTEND_SERVER_URL || env.FRONTEND_LOCAL_URL
      : env.FRONTEND_LOCAL_URL;
  }
}

export const authService = new AuthService();
