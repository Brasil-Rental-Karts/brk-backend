import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

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
    // Example of adding context to Sentry
    Sentry.setContext('health_check', {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Example of capturing a message
    Sentry.captureMessage('Health check performed', 'info');

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  }
}
