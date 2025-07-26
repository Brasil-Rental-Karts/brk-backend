import { Request, Response } from 'express';

import { BaseController } from './base.controller';

/**
 * Health controller for checking API status
 */
export class HealthController extends BaseController {
  constructor() {
    super('/health');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * GET /health
     * Health check endpoint to verify API is running
     */
    this.router.get('/', this.getHealth.bind(this));
  }

  private getHealth(req: Request, res: Response): void {
    // Log health check as info
    console.log(`🏥 [HEALTH] Health check performed - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  }
}
