import { prisma } from "../configs/prisma";

class HealthService {
    async checkDatabase() {
        await prisma.$queryRaw`SELECT 1`;

        return {
            database: "reachable",
            timestamp: new Date().toISOString(),
        };
    }

    getServiceStatus() {
        return {
            service: "FinFlow Backend",
            timestamp: new Date().toISOString(),
        };
    }

    getRootStatus() {
        return {
            service: "FinFlow Backend",
        };
    }
}

export default HealthService;