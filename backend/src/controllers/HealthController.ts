import ApiResponse from "../utils/ApiResponse";
import HealthService from "../services/HealthService";
import { Request, Response } from "express";

class HealthController {
    private healthService: HealthService;

    constructor(healthService: HealthService) {
        this.healthService = healthService;
    }

    health = async (_req: Request, res: Response) => {
        return ApiResponse.success(res, "Backend is healthy", this.healthService.getServiceStatus());
    };

    databaseHealth = async (_req: Request, res: Response) => {
        try {
            const data = await this.healthService.checkDatabase();
            return ApiResponse.success(res, "Database is healthy", data);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown database error";
            return ApiResponse.error(res, "Database is unreachable", 503, [message]);
        }
    };

    root = async (_req: Request, res: Response) => {
        return ApiResponse.success(res, "Backend running successfully", this.healthService.getRootStatus());
    };
}

export default HealthController;