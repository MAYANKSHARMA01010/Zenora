import {
  createAdminProfileSchema,
  createClientProfileSchema,
  createTherapistProfileSchema,
} from "../validators/profile.validation";

describe("profile.validation", () => {
  describe("createClientProfileSchema", () => {
    it("accepts valid client payload", async () => {
      const parsed = await createClientProfileSchema.body.parseAsync({
        language: "en",
        gender: "male",
        emergencyContact: "+91-9999999999",
        dataVisibility: "private",
      });

      expect(parsed.language).toBe("en");
      expect(parsed.dataVisibility).toBe("private");
    });

    it("rejects invalid dataVisibility", async () => {
      await expect(
        createClientProfileSchema.body.parseAsync({
          dataVisibility: "public",
        }),
      ).rejects.toThrow();
    });
  });

  describe("createTherapistProfileSchema", () => {
    it("accepts required therapist payload", async () => {
      const parsed = await createTherapistProfileSchema.body.parseAsync({
        licenseNumber: "LIC-1234",
        specialization: "Anxiety",
        experience: 5,
        workingHours: { monday: ["09:00-17:00"] },
      });

      expect(parsed.licenseNumber).toBe("LIC-1234");
      expect(parsed.experience).toBe(5);
    });

    it("rejects payload when licenseNumber is missing", async () => {
      await expect(
        createTherapistProfileSchema.body.parseAsync({
          specialization: "Depression",
          experience: 5,
          workingHours: { monday: ["09:00-17:00"] },
        }),
      ).rejects.toThrow();
    });
  });

  describe("createAdminProfileSchema", () => {
    it("accepts valid admin payload", async () => {
      const parsed = await createAdminProfileSchema.body.parseAsync({
        adminLevel: 3,
        department: "Operations",
      });

      expect(parsed.adminLevel).toBe(3);
      expect(parsed.department).toBe("Operations");
    });

    it("rejects adminLevel outside range", async () => {
      await expect(
        createAdminProfileSchema.body.parseAsync({
          adminLevel: 10,
        }),
      ).rejects.toThrow();
    });
  });
});
