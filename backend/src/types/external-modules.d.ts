declare module "express" {
    export interface Request {
        [key: string]: unknown;
    }

    export interface Response {
        status(code: number): Response;
        json(body: unknown): Response;
    }

    export interface Router {
        get(path: string, ...handlers: any[]): Router;
    }

    export interface Application {
        use(...args: unknown[]): Application;
        listen(port: number, callback?: () => void): void;
    }

    interface ExpressStatic {
        (): Application;
        json(): unknown;
        Router(): Router;
    }

    const express: ExpressStatic;
    export default express;
}

declare module "cors" {
    export interface CorsOptions {
        origin?: (
            origin: string | undefined,
            callback: (error: Error | null, allow?: boolean) => void
        ) => void;
        credentials?: boolean;
        methods?: string[];
        allowedHeaders?: string[];
    }

    function cors(options?: CorsOptions): unknown;
    export default cors;
}
