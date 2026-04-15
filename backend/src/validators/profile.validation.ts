import { z } from "zod";

const dataVisibilitySchema = z.enum(["private", "therapist_only", "shared"]);
const adminLevelSchema = z.number().int().min(1).max(5);

export const createClientProfileSchema = {
  body: z.object({
    language: z.string().trim().min(2).max(10).optional(),
    gender: z.string().trim().min(1).max(50).optional(),
    emergencyContact: z.string().trim().min(3).max(50).optional(),
    dataVisibility: dataVisibilitySchema.optional(),
  }),
};

export const createTherapistProfileSchema = {
  body: z.object({
    licenseNumber: z.string().trim().min(3).max(100),
    specialization: z.string().trim().min(2).max(100),
    experience: z.number().int().min(0).max(60),
    workingHours: z.record(z.string(), z.any()),
    bio: z.string().trim().min(10).max(2000).optional(),
    bankAccountInfo: z.record(z.string(), z.any()).optional(),
  }),
};

export const createAdminProfileSchema = {
  body: z.object({
    adminLevel: adminLevelSchema.optional(),
    department: z.string().trim().min(2).max(100).optional(),
  }),
};
