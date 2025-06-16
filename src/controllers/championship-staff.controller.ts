import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ChampionshipStaffService, AddStaffMemberRequest } from '../services/championship-staff.service';
import { authMiddleware, requireMember } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { BaseDto } from '../dtos/base.dto';

class AddStaffMemberDto extends BaseDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

/**
 * @swagger
 * tags:
 *   name: Championship Staff
 *   description: Championship staff management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AddStaffMemberDto:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário a ser adicionado ao staff
 *           example: "usuario@exemplo.com"
 *     StaffMemberResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único do membro do staff
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         role:
 *           type: string
 *           enum: [staff]
 *         addedAt:
 *           type: string
 *           format: date-time
 *         addedBy:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             email:
 *               type: string
 */

export class ChampionshipStaffController extends BaseController {
  constructor(private championshipStaffService: ChampionshipStaffService) {
    super('/championships');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /championships/{championshipId}/staff:
     *   get:
     *     summary: Get championship staff members
     *     tags: [Championship Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: Championship ID
     *     responses:
     *       200:
     *         description: Staff members retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StaffMemberResponse'
     *       403:
     *         description: Forbidden - No permission to view staff
     *       404:
     *         description: Championship not found
     */
    this.router.get('/:championshipId/staff', authMiddleware, requireMember, this.getStaffMembers.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/staff:
     *   post:
     *     summary: Add staff member to championship
     *     tags: [Championship Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: Championship ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AddStaffMemberDto'
     *     responses:
     *       201:
     *         description: Staff member added successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/StaffMemberResponse'
     *       400:
     *         description: Bad request - Invalid data or user already in staff
     *       403:
     *         description: Forbidden - No permission to add staff
     *       404:
     *         description: Championship or user not found
     */
    this.router.post('/:championshipId/staff', authMiddleware, requireMember, validationMiddleware(AddStaffMemberDto), this.addStaffMember.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/staff/{staffMemberId}:
     *   delete:
     *     summary: Remove staff member from championship
     *     tags: [Championship Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: Championship ID
     *       - in: path
     *         name: staffMemberId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: Staff member ID
     *     responses:
     *       200:
     *         description: Staff member removed successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       403:
     *         description: Forbidden - No permission to remove staff
     *       404:
     *         description: Championship or staff member not found
     */
    this.router.delete('/:championshipId/staff/:staffMemberId', authMiddleware, requireMember, this.removeStaffMember.bind(this));
  }

  private async getStaffMembers(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.championshipId;
      const userId = (req as any).user.id;

      // Verificar se o usuário tem permissão para ver o staff
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({ message: 'Você não tem permissão para ver o staff deste campeonato' });
        return;
      }

      const staffMembers = await this.championshipStaffService.getStaffMembers(championshipId);
      res.json({ data: staffMembers });
    } catch (error: any) {
      console.error('Error getting staff members:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async addStaffMember(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.championshipId;
      const userId = (req as any).user.id;
      const request: AddStaffMemberRequest = req.body;
      


      const staffMember = await this.championshipStaffService.addStaffMember(championshipId, request, userId);
      
      res.status(201).json({
        message: 'Membro adicionado ao staff com sucesso',
        data: staffMember
      });
    } catch (error: any) {
      console.error('Error adding staff member:', error);
      
      if (error.status === 404) {
        res.status(404).json({ message: error.message });
      } else if (error.status === 400) {
        res.status(400).json({ message: error.message });
      } else if (error.status === 403) {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async removeStaffMember(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.championshipId;
      const staffMemberId = req.params.staffMemberId;
      const userId = (req as any).user.id;

      await this.championshipStaffService.removeStaffMember(championshipId, staffMemberId, userId);
      
      res.json({ message: 'Membro removido do staff com sucesso' });
    } catch (error: any) {
      console.error('Error removing staff member:', error);
      
      if (error.status === 404) {
        res.status(404).json({ message: error.message });
      } else if (error.status === 403) {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }
} 