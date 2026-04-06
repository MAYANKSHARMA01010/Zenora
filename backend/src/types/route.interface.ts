import express, { Router } from "express";

class RouteInterface {
    path: string;
    router: Router;

    constructor(path: string) {
        this.path = path;
        this.router = express.Router();
    }
}

export default RouteInterface;