import { type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiResponse } from "../utils/ApiResponse";
import { profileService } from "../services/profile.service";

export class ProfileController {
  public async createClientProfile(req: Request, res: Response) {
    const body = req.body as {
      language?: string;
      gender?: string;
      emergencyContact?: string;
      dataVisibility?: "private" | "therapist_only" | "shared";
    };

    const data = await profileService.createClientProfile(req.user!.id, req.user!.role, body);
    return ApiResponse.success(res, 201, "Client profile created successfully", data);
  }

  public async createTherapistProfile(req: Request, res: Response) {
    const body = req.body as {
      licenseNumber: string;
      specialization: string;
      experience: number;
      workingHours: Prisma.InputJsonValue;
      bio?: string;
      bankAccountInfo?: Prisma.InputJsonValue;
    };

    const data = await profileService.createTherapistProfile(req.user!.id, req.user!.role, body);
    return ApiResponse.success(res, 201, "Therapist profile created successfully", data);
  }

  public async createAdminProfile(req: Request, res: Response) {
    const body = req.body as {
      adminLevel?: number;
      department?: string;
    };

    const data = await profileService.createAdminProfile(req.user!.id, req.user!.role, body);
    return ApiResponse.success(res, 201, "Admin profile created successfully", data);
  }
}

export const profileController = new ProfileController();
