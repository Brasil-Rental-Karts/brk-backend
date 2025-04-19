import express, { Router } from 'express';

export abstract class BaseController {
  public router: Router;
  public path: string;

  constructor(path: string) {
    this.router = express.Router();
    this.path = path;
  }

  abstract initializeRoutes(): void;
} 