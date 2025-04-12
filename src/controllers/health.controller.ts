import { Request, Response } from 'express';
import { BaseController } from './base.controller';

export class HealthController extends BaseController {
  constructor() {
    super('/health');
  }

  public initializeRoutes(): void {
    this.router.get('/', this.getHealth.bind(this));
  }

  private getHealth(req: Request, res: Response): void {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  }
} 