import "dotenv/config";
import App from "./app";
import HealthRoutes from "./routes/health.routes";

const app = new App([new HealthRoutes()]);
app.startServer();
