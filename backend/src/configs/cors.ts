import cors, { CorsOptions } from "cors";

declare const process: {
    env: Record<string, string | undefined>;
};

const isProd = process.env.NODE_ENV === "production";

const allowedOrigins = (isProd
    ? [process.env.FRONTEND_SERVER_URL]
    : [process.env.FRONTEND_LOCAL_URL]
).filter((origin): origin is string => Boolean(origin));

if (allowedOrigins.length === 0) {
    throw new Error("CORS origin is not defined");
}

const corsOptions: CorsOptions = {
    origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void
    ) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        console.warn(`Blocked by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;