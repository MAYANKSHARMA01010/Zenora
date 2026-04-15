import { Router } from "express";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { ValidationMiddleware } from "../middlewares/validate";
import { AsyncUtils } from "../utils/asyncHandler";
import { profileController } from "../controllers/profile.controller";
import { Routes } from "../interfaces/route.interface";
import {
  createAdminProfileSchema,
  createClientProfileSchema,
  createTherapistProfileSchema,
} from "../validators/profile.validation";

export default class ProfileRoutes implements Routes {
  public path = "/api/v1/profiles";
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/client",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(createClientProfileSchema),
      AsyncUtils.wrap(profileController.createClientProfile.bind(profileController)),
    );

    this.router.post(
      "/therapist",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(createTherapistProfileSchema),
      AsyncUtils.wrap(profileController.createTherapistProfile.bind(profileController)),
    );

    this.router.post(
      "/admin",
      AuthMiddleware.authenticate,
      ValidationMiddleware.validate(createAdminProfileSchema),
      AsyncUtils.wrap(profileController.createAdminProfile.bind(profileController)),
    );
  }
}
