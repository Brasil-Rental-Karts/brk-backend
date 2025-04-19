import { Request, Response } from 'express';
import { BaseController } from './base.controller';

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check endpoints
 */
export class HealthController extends BaseController {
  constructor() {
    super('/health');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Get health status
     *     description: Check if the API is running
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: API is running
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: UP
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                   example: 2023-01-01T00:00:00Z
     */
    this.router.get('/', this.getHealth.bind(this));
  }

  private getHealth(req: Request, res: Response): void {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  }
} 