import { createHash } from "node:crypto";
import { RedisService } from "../config/redis";
import { AuthUtils } from "../utils/AuthUtils";
import { logger } from "../utils/logger";

const REVOKED_PREFIX = "auth:revoked-refresh:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export class TokenService {
  private static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private static key(token: string): string {
    return `${REVOKED_PREFIX}${this.hashToken(token)}`;
  }

  public static async revokeRefreshToken(token: string): Promise<void> {
    const decoded = AuthUtils.decodeRefreshToken(token);
    const ttlSeconds = this.calculateTtl(decoded?.exp);

    try {
      const redis = RedisService.getInstance();
      await redis.set(this.key(token), "1", "EX", ttlSeconds);
    } catch (error) {
      logger.warn("Failed to revoke refresh token in Redis; logout not persisted", {
        error: (error as Error).message,
      });
    }
  }

  public static async isRefreshTokenRevoked(token: string): Promise<boolean> {
    try {
      const redis = RedisService.getInstance();
      const value = await redis.get(this.key(token));
      return value !== null;
    } catch (error) {
      logger.warn("Failed to check refresh token revocation in Redis", {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private static calculateTtl(exp?: number): number {
    if (!exp) return DEFAULT_TTL_SECONDS;
    const remaining = exp - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : DEFAULT_TTL_SECONDS;
  }
}
