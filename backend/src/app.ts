import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { corsOptions } from "./config/corsOptions";
import { LogMiddleware } from "./middlewares/requestLogger";
import { RateLimitMiddleware } from "./middlewares/rateLimiter";
import { ErrorMiddleware } from "./middlewares/errorHandler";
import { ApiResponse } from "./utils/ApiResponse";
import { authRouter } from "./routes/auth.routes";

export class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.setMiddlewares();
    this.setRoutes();
    this.setErrorHandlers();
  }

  private setMiddlewares(): void {
    // 1. helmet()
    this.express.use(helmet());

    // 2. cors(corsOptions)
    this.express.use(cors(corsOptions));

    // 3. express.json({ limit: "10mb" })
    this.express.use(express.json({ limit: "10mb" }));

    // 4. express.urlencoded({ extended: true })
    this.express.use(express.urlencoded({ extended: true }));

    // 5. requestLogger middleware
    this.express.use(LogMiddleware.handle());

    // 6. rateLimiter (100 req/15min per IP globally)
    this.express.use(RateLimitMiddleware.handle());
  }

  private setRoutes(): void {
    // 7. /api/v1/health route
    this.express.get("/api/v1/health", (req: Request, res: Response) => {
      return ApiResponse.success(res, 200, "MentalCare API is healthy", {
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // 8. Mount auth router
    this.express.use("/api/v1/auth", authRouter);
  }

  private setErrorHandlers(): void {
    // 9. 404 handler for unmatched routes
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      const error = new Error(`Route ${req.originalUrl} not found`);
      (error as any).statusCode = 404;
      next(error);
    });

    // 10. Global errorHandler (must be last)
    this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      ErrorMiddleware.handle(err, req, res, next);
    });
  }
}

export const app = new App().express;
