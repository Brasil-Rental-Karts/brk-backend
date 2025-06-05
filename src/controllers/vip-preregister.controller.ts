import { Request, Response, NextFunction } from 'express';
import { BaseController } from './base.controller';
import { VipPreregisterService } from '../services/vip-preregister.service';
import { CreateVipPreregisterDto } from '../dtos/vip-preregister.dto';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';

/**
 * @swagger
 * tags:
 *   name: VIP Preregister
 *   description: VIP preregistration endpoints
 */

/**
 * Controller for VIP preregistration management
 */
export class VipPreregisterController extends BaseController {
  private vipPreregisterService: VipPreregisterService;

  constructor(vipPreregisterService: VipPreregisterService) {
    super('/vip-preregister');
    this.vipPreregisterService = vipPreregisterService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    /**
     * @swagger
     * /vip-preregister:
     *   post:
     *     tags: [VIP Preregister]
     *     summary: Register for VIP list
     *     description: Register a user for the VIP list (public endpoint)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateVipPreregisterDto'
     *     responses:
     *       201:
     *         description: Successfully registered for VIP list
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Successfully registered for VIP list"
     *                 data:
     *                   $ref: '#/components/schemas/VipPreregister'
     *       400:
     *         description: Bad request - Invalid data
     *       409:
     *         description: Conflict - Email already registered
     *       500:
     *         description: Internal server error
     */
    this.router.post('/', this.createPreregister.bind(this));

    /**
     * @swagger
     * /vip-preregister/list:
     *   get:
     *     tags: [VIP Preregister]
     *     summary: Get all VIP preregistrations
     *     description: Retrieve all VIP preregistrations (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of VIP preregistrations retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "VIP preregistrations retrieved successfully"
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/VipPreregister'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       500:
     *         description: Internal server error
     */
    this.router.get('/list', authMiddleware, roleMiddleware([UserRole.ADMINISTRATOR]), this.getAllPreregisters.bind(this));

    /**
     * @swagger
     * /vip-preregister/check/{email}:
     *   get:
     *     tags: [VIP Preregister]
     *     summary: Check if email is registered
     *     description: Check if an email is already registered in VIP list (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: email
     *         required: true
     *         schema:
     *           type: string
     *           format: email
     *         description: Email to check
     *     responses:
     *       200:
     *         description: Email check result
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Email check completed"
     *                 data:
     *                   type: object
     *                   properties:
     *                     exists:
     *                       type: boolean
     *                     preregister:
     *                       $ref: '#/components/schemas/VipPreregister'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       500:
     *         description: Internal server error
     */
    this.router.get('/check/:email', authMiddleware, roleMiddleware([UserRole.ADMINISTRATOR]), this.checkEmail.bind(this));
  }

  private async createPreregister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dto, errors } = await CreateVipPreregisterDto.validateDto(CreateVipPreregisterDto, req.body);
      
      if (errors.length > 0) {
        res.status(400).json({
          message: 'Validation failed',
          errors
        });
        return;
      }

      const preregister = await this.vipPreregisterService.createPreregister(dto!);
      
      res.status(201).json({
        message: 'Successfully registered for VIP list',
        data: preregister
      });
    } catch (error) {
      next(error);
    }
  }

  private async getAllPreregisters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preregisters = await this.vipPreregisterService.getAllPreregisters();
      
      res.status(200).json({
        message: 'VIP preregistrations retrieved successfully',
        data: preregisters
      });
    } catch (error) {
      next(error);
    }
  }

  private async checkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;
      const preregister = await this.vipPreregisterService.findByEmail(email);
      
      res.status(200).json({
        message: 'Email check completed',
        data: {
          exists: !!preregister,
          preregister: preregister || null
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 