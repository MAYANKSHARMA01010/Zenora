import { Response } from "express";

class ApiResponse {
    static success(res: Response, message: string, data: Record<string, unknown> = {}) {
        return res.status(200).json({
            success: true,
            message,
            data,
        });
    }

    static error(
        res: Response,
        message: string,
        statusCode = 500,
        errors: string[] = []
    ) {
        return res.status(statusCode).json({
            success: false,
            message,
            errors,
        });
    }
}

export default ApiResponse;