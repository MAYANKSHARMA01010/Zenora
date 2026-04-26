import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { Role } from "../constants/roles";

interface TokenPayload {
  id: string;
  role: Role;
  isActive: boolean;
}

interface PasswordResetPayload {
  id: string;
  email: string;
  purpose: "password-reset";
}

interface OAuthStatePayload {
  role: Role;
  purpose: "google-oauth-state";
}

interface EmailVerificationPayload {
  id: string;
  email: string;
  purpose: "email-verification";
}

export interface DecodedRefreshToken extends TokenPayload {
  iat?: number;
  exp?: number;
  jti?: string;
}

export class AuthUtils {
  /**
   * Generate Access and Refresh JWT tokens
   * @param payload User data to include in token
   */
  public static generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, env.JWT_SESSION_SECRET, {
      expiresIn: env.JWT_SESSION_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify a JWT token
   * @param token JWT token string
   */
  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SESSION_SECRET) as TokenPayload;
  }

  /**
   * Verify a refresh JWT token
   * @param token JWT token string
   */
  public static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  }

  /**
   * Generate a password reset token
   * @param payload User data to include in token
   */
  public static generatePasswordResetToken(payload: { id: string; email: string }) {
    return jwt.sign(
      { ...payload, purpose: "password-reset" },
      env.JWT_SESSION_SECRET,
      {
        expiresIn: "1h",
      },
    );
  }

  /**
   * Verify a password reset token
   * @param token JWT token string
   */
  public static verifyPasswordResetToken(token: string): PasswordResetPayload {
    const decoded = jwt.verify(token, env.JWT_SESSION_SECRET) as PasswordResetPayload;

    if (decoded.purpose !== "password-reset") {
      throw new Error("Invalid password reset token");
    }

    return decoded;
  }

  /**
   * Generate OAuth state for Google login
   * @param role Selected role
   */
  public static generateGoogleOAuthState(role: Role): string {
    return jwt.sign(
      { role, purpose: "google-oauth-state" },
      env.JWT_SESSION_SECRET,
      { expiresIn: "10m" },
    );
  }

  /**
   * Verify OAuth state from Google callback
   * @param state OAuth state string
   */
  public static verifyGoogleOAuthState(state: string): OAuthStatePayload {
    const decoded = jwt.verify(state, env.JWT_SESSION_SECRET) as OAuthStatePayload;

    if (decoded.purpose !== "google-oauth-state") {
      throw new Error("Invalid OAuth state");
    }

    return decoded;
  }

  /**
   * Generate an email verification token
   */
  public static generateEmailVerificationToken(payload: { id: string; email: string }) {
    return jwt.sign(
      { ...payload, purpose: "email-verification" },
      env.JWT_SESSION_SECRET,
      { expiresIn: "24h" },
    );
  }

  /**
   * Verify an email verification token
   */
  public static verifyEmailVerificationToken(token: string): EmailVerificationPayload {
    const decoded = jwt.verify(token, env.JWT_SESSION_SECRET) as EmailVerificationPayload;

    if (decoded.purpose !== "email-verification") {
      throw new Error("Invalid email verification token");
    }

    return decoded;
  }

  /**
   * Decode refresh token without throwing (used for revocation)
   */
  public static decodeRefreshToken(token: string): DecodedRefreshToken | null {
    return jwt.decode(token) as DecodedRefreshToken | null;
  }

  /**
   * Hash a plain text password
   * @param password Plain text password
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password Plain text password
   * @param hash Hashed password
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
