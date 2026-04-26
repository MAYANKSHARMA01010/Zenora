import { User } from "../entities/User";
import { Role } from "../constants/roles";

describe("User entity", () => {
  it("normalizes email and trims name on create", async () => {
    const user = await User.create({
      name: "  Alice  ",
      email: "  ALICE@Example.com ",
      password: "Strong1Pass",
      role: Role.CLIENT,
    });

    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.role).toBe(Role.CLIENT);
    expect(user.isActive).toBe(true);
    expect(user.isEmailVerified).toBe(false);
    expect(user.onboardingCompleted).toBe(false);
  });

  it("hashes the password and verifies it", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.CLIENT,
    });

    const persistence = user.toPersistence();
    expect(persistence.passwordHash).not.toBe("Strong1Pass");

    await expect(user.verifyPassword("Strong1Pass")).resolves.toBe(true);
    await expect(user.verifyPassword("wrong")).resolves.toBe(false);
  });

  it("does not expose the password hash in toResponse", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.THERAPIST,
    });

    const response = user.toResponse() as unknown as Record<string, unknown>;
    expect(response.passwordHash).toBeUndefined();
    expect(response.email).toBe("bob@example.com");
    expect(response.role).toBe(Role.THERAPIST);
  });

  it("setPassword updates hash and verification works", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.CLIENT,
    });

    await user.setPassword("BrandNew2Pass");
    await expect(user.verifyPassword("Strong1Pass")).resolves.toBe(false);
    await expect(user.verifyPassword("BrandNew2Pass")).resolves.toBe(true);
  });

  it("markEmailVerified is idempotent", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.CLIENT,
    });
    user.markEmailVerified();
    expect(user.isEmailVerified).toBe(true);
    user.markEmailVerified();
    expect(user.isEmailVerified).toBe(true);
  });

  it("completeOnboarding updates name, flags and profile", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.CLIENT,
    });

    user.completeOnboarding({
      fullName: "Robert Smith",
      careGoal: "stress",
      sessionStyle: "video",
      reminderChannel: "email",
    });

    expect(user.name).toBe("Robert Smith");
    expect(user.onboardingCompleted).toBe(true);
    expect(user.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(user.onboardingProfile).toMatchObject({ careGoal: "stress" });
  });

  it("getTokenPayload returns id, role and isActive only", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Strong1Pass",
      role: Role.ADMIN,
    });

    expect(user.getTokenPayload()).toEqual({
      id: user.id,
      role: Role.ADMIN,
      isActive: true,
    });
  });
});
