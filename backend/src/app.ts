import express, { Application } from "express";
import corsMiddleware from "./configs/cors";
import RouteInterface from "./types/route.interface";

declare const process: {
    env: Record<string, string | undefined>;
};

class App {
    public app: Application;
    public port: number;

    constructor(routes: RouteInterface[]) {
        this.app = express();
        this.port = Number(process.env.SERVER_PORT || 5001);

        this.initializeMiddlewares();
        this.initializeRoutes(routes);
    }

    public startServer() {
        this.app.listen(this.port, () => {
            console.log(`DEBUG: NODE_ENV = ${process.env.NODE_ENV}`);
            console.log(`Local Backend URL: ${process.env.BACKEND_LOCAL_URL}`);
            console.log(`Deployed Backend URL: ${process.env.BACKEND_SERVER_URL}`);
        });
    }

    private initializeMiddlewares() {
        this.app.use(corsMiddleware);
        this.app.use(express.json());
    }

    private initializeRoutes(routes: RouteInterface[]) {
        routes.forEach((route) => {
            this.app.use(route.path, route.router);
        });
    }
}

export default App;