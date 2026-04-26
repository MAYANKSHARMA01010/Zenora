import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validation";

describe("auth.validation", () => {
  describe("registerSchema", () => {
    it("accepts a valid client registration payload", async () => {
      const parsed = await registerSchema.body.parseAsync({
        name: "Jane Doe",
        email: "JANE@Example.com",
        password: "Strong1Pass",
        role: "CLIENT",
      });

      expect(parsed.email).toBe("jane@example.com");
      expect(parsed.role).toBe("CLIENT");
    });

    it("rejects weak passwords", async () => {
      await expect(
        registerSchema.body.parseAsync({
          name: "Jane",
          email: "jane@example.com",
          password: "weakpass",
          role: "CLIENT",
        }),
      ).rejects.toThrow();
    });

    it("rejects ADMIN as a self-register role", async () => {
      await expect(
        registerSchema.body.parseAsync({
          name: "Bad Actor",
          email: "bad@example.com",
          password: "Strong1Pass",
          role: "ADMIN",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid email", async () => {
      await expect(
        registerSchema.body.parseAsync({
          name: "Jane",
          email: "not-an-email",
          password: "Strong1Pass",
          role: "CLIENT",
        }),
      ).rejects.toThrow();
    });
  });

  describe("loginSchema", () => {
    it("accepts a valid login payload", async () => {
      const parsed = await loginSchema.body.parseAsync({
        email: "user@example.com",
        password: "anything",
        role: "THERAPIST",
      });
      expect(parsed.role).toBe("THERAPIST");
    });

    it("requires a role", async () => {
      await expect(
        loginSchema.body.parseAsync({
          email: "user@example.com",
          password: "anything",
        }),
      ).rejects.toThrow();
    });
  });

  describe("refreshSchema", () => {
    it("rejects empty refresh token", async () => {
      await expect(refreshSchema.body.parseAsync({ refreshToken: "" })).rejects.toThrow();
    });
  });

  describe("forgotPasswordSchema", () => {
    it("normalizes email", async () => {
      const parsed = await forgotPasswordSchema.body.parseAsync({ email: "  X@Y.COM " });
      expect(parsed.email).toBe("x@y.com");
    });
  });

  describe("resetPasswordSchema", () => {
    it("requires strong new password", async () => {
      await expect(
        resetPasswordSchema.body.parseAsync({
          token: "some-long-reset-token",
          newPassword: "weak",
        }),
      ).rejects.toThrow();
    });
  });

  describe("changePasswordSchema", () => {
    it("requires current password", async () => {
      await expect(
        changePasswordSchema.body.parseAsync({
          currentPassword: "",
          newPassword: "Strong1Pass",
        }),
      ).rejects.toThrow();
    });
  });

  describe("verifyEmailSchema", () => {
    it("requires token", async () => {
      await expect(verifyEmailSchema.body.parseAsync({ token: "" })).rejects.toThrow();
    });
  });
});
