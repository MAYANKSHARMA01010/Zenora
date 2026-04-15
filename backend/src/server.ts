import { App } from "./app";
import { env } from "./config/env";
import { DatabaseService } from "./config/database";
import { LoggerService } from "./utils/logger";
import { RedisService } from "./config/redis";
import AuthRoutes from "./routes/auth.routes";
import ProfileRoutes from "./routes/profile.routes";

const app = new App([new AuthRoutes(), new ProfileRoutes()]).express;

export class Server {
  public static async start(): Promise<void> {
    try {
      // 1. Connect to Database
      await DatabaseService.getInstance();

      // 2. Initialize Redis
      RedisService.getInstance();
      
      // 3. Start Listening
      const server = app.listen(env.SERVER_PORT, () => {
        LoggerService.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.SERVER_PORT}`);
      });

      // 4. Graceful Shutdown
      const shutdown = async () => {
        LoggerService.info("Graceful shutdown initiated...");
        server.close(async () => {
          LoggerService.info("Closed out remaining connections.");
          await DatabaseService.disconnect();
          await RedisService.disconnect();
          process.exit(0);
        });

        // Force shutdown if it takes too long
        setTimeout(() => {
          LoggerService.error("Could not close connections in time, forcefully shutting down");
          process.exit(1);
        }, 10000);
      };

      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);

    } catch (error) {
      LoggerService.error("Failed to start server:", error as any);
      process.exit(1);
    }
  }
}

// Start the server
Server.start();
