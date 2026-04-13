import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVER_PORT: z.preprocess((val) => Number(val), z.number()).default(5000),

  FRONTEND_LOCAL_URL: z.string().url().default("http://localhost:3000"),
  FRONTEND_SERVER_URL: z.string().url().optional().or(z.literal("")),

  BACKEND_LOCAL_URL: z.string().url().default("http://localhost:5001"),
  BACKEND_SERVER_URL: z.string().url().optional().or(z.literal("")),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SESSION_SECRET: z.string().min(32),
  JWT_SESSION_EXPIRES_IN: z.string().default("15m"),

  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  BCRYPT_SALT_ROUNDS: z.preprocess((val) => Number(val), z.number().int()).default(12),
  
  RATE_LIMIT_WINDOW_MS: z.preprocess((val) => Number(val), z.number().int()).default(900000),
  RATE_LIMIT_MAX: z.preprocess((val) => Number(val), z.number().int()).default(100),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;

export const normalizedEnv = {
  ...env,
  PORT: env.SERVER_PORT,
  CLIENT_URL: env.NODE_ENV === "production" ? env.FRONTEND_SERVER_URL || env.FRONTEND_LOCAL_URL : env.FRONTEND_LOCAL_URL,
  BACKEND_URL: env.NODE_ENV === "production" ? env.BACKEND_SERVER_URL || env.BACKEND_LOCAL_URL : env.BACKEND_LOCAL_URL,
  JWT_SECRET: env.JWT_SESSION_SECRET,
  JWT_ACCESS_EXPIRES_IN: env.JWT_SESSION_EXPIRES_IN,
};
