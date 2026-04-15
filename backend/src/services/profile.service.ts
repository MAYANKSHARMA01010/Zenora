import { DatabaseService } from "../config/database";
import { Prisma } from "@prisma/client";
import { Role } from "../constants/roles";
import { ApiError } from "../utils/ApiError";

type CreateClientProfilePayload = {
  language?: string;
  gender?: string;
  emergencyContact?: string;
  dataVisibility?: "private" | "therapist_only" | "shared";
};

type CreateTherapistProfilePayload = {
  licenseNumber: string;
  specialization: string;
  experience: number;
  workingHours: Prisma.InputJsonValue;
  bio?: string;
  bankAccountInfo?: Prisma.InputJsonValue;
};

type CreateAdminProfilePayload = {
  adminLevel?: number;
  department?: string;
};

export class ProfileService {
  private ensureRole(actualRole: string, expectedRole: Role) {
    if (actualRole !== expectedRole) {
      throw ApiError.forbidden(`Only ${expectedRole} users can create this profile`);
    }
  }

  public async createClientProfile(userId: string, userRole: string, payload: CreateClientProfilePayload) {
    this.ensureRole(userRole, Role.CLIENT);
    const db = await DatabaseService.getInstance();

    const existing = await db.client.findUnique({ where: { id: userId }, select: { id: true } });
    if (existing) {
      throw ApiError.conflict("Client profile already exists");
    }

    const profile = await db.client.create({
      data: {
        id: userId,
        language: payload.language,
        gender: payload.gender,
        emergencyContact: payload.emergencyContact,
        dataVisibility: payload.dataVisibility,
      },
      select: {
        id: true,
        language: true,
        gender: true,
        emergencyContact: true,
        dataVisibility: true,
      },
    });

    return { profile };
  }

  public async createTherapistProfile(userId: string, userRole: string, payload: CreateTherapistProfilePayload) {
    this.ensureRole(userRole, Role.THERAPIST);
    const db = await DatabaseService.getInstance();

    const existing = await db.therapist.findUnique({ where: { id: userId }, select: { id: true } });
    if (existing) {
      throw ApiError.conflict("Therapist profile already exists");
    }

    const duplicateLicense = await db.therapist.findUnique({
      where: { licenseNumber: payload.licenseNumber.trim() },
      select: { id: true },
    });
    if (duplicateLicense) {
      throw ApiError.conflict("This license number is already registered");
    }

    const profile = await db.therapist.create({
      data: {
        id: userId,
        licenseNumber: payload.licenseNumber.trim(),
        specialization: payload.specialization.trim(),
        experience: payload.experience,
        workingHours: payload.workingHours,
        bio: payload.bio?.trim(),
        bankAccountInfo: payload.bankAccountInfo,
      },
      select: {
        id: true,
        licenseNumber: true,
        specialization: true,
        experience: true,
        workingHours: true,
        bio: true,
        isVerified: true,
        rating: true,
        totalRatings: true,
      },
    });

    return { profile };
  }

  public async createAdminProfile(userId: string, userRole: string, payload: CreateAdminProfilePayload) {
    this.ensureRole(userRole, Role.ADMIN);
    const db = await DatabaseService.getInstance();

    const existing = await db.admin.findUnique({ where: { id: userId }, select: { id: true } });
    if (existing) {
      throw ApiError.conflict("Admin profile already exists");
    }

    const profile = await db.admin.create({
      data: {
        id: userId,
        adminLevel: payload.adminLevel,
        department: payload.department?.trim(),
      },
      select: {
        id: true,
        adminLevel: true,
        department: true,
      },
    });

    return { profile };
  }
}

export const profileService = new ProfileService();
