import HealthController from "../controllers/HealthController";
import HealthService from "../services/HealthService";
import RouteInterface from "../types/route.interface";

class HealthRoutes extends RouteInterface {
    private healthController: HealthController;

    constructor() {
        super("/");
        this.healthController = new HealthController(new HealthService());
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/", this.healthController.root);
        this.router.get("/health", this.healthController.health);
        this.router.get("/health/db", this.healthController.databaseHealth);
    }
}

export default HealthRoutes;