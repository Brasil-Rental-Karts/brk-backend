import { Request, Response } from 'express';

import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { authMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';
import {
  CreateParticipationData,
  StageParticipationService,
} from '../services/stage-participation.service';
import { BaseController } from './base.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     StageParticipation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         stageId:
 *           type: string
 *           format: uuid
 *         categoryId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [confirmed, cancelled]
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             ballast:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ConfirmParticipationRequest:
 *       type: object
 *       required:
 *         - stageId
 *         - categoryId
 *       properties:
 *         stageId:
 *           type: string
 *           format: uuid
 *           description: ID da etapa
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: ID da categoria
 */

export class StageParticipationController extends BaseController {
  private stageParticipationService: StageParticipationService;

  constructor() {
    super('/stage-participations');
    this.stageParticipationService = new StageParticipationService();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /stage-participations/confirm:
     *   post:
     *     summary: Confirmar participação do usuário em uma etapa
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ConfirmParticipationRequest'
     *     responses:
     *       201:
     *         description: Participação confirmada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/StageParticipation'
     *       400:
     *         description: Dados inválidos ou regra de negócio violada
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/confirm',
      authMiddleware,
      this.confirmParticipation.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/cancel:
     *   post:
     *     summary: Cancelar participação do usuário em uma etapa
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stageId
     *               - categoryId
     *             properties:
     *               stageId:
     *                 type: string
     *                 format: uuid
     *               categoryId:
     *                 type: string
     *                 format: uuid
     *               reason:
     *                 type: string
     *                 description: Motivo do cancelamento (opcional)
     *     responses:
     *       200:
     *         description: Participação cancelada com sucesso
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Participação não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/cancel',
      authMiddleware,
      this.cancelParticipation.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/my:
     *   get:
     *     summary: Buscar participações do usuário logado
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de participações do usuário
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StageParticipation'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/my', authMiddleware, this.getMyParticipations.bind(this));

    /**
     * @swagger
     * /stage-participations/my/upcoming:
     *   get:
     *     summary: Buscar próximas participações do usuário logado
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de próximas participações do usuário
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StageParticipation'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get(
      '/my/upcoming',
      authMiddleware,
      this.getMyUpcomingParticipations.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/bulk-cancel:
     *   post:
     *     summary: Cancelar participação em massa de pilotos em uma etapa
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stageId
     *               - cancellations
     *             properties:
     *               stageId:
     *                 type: string
     *                 format: uuid
     *                 description: ID da etapa
     *               cancellations:
     *                 type: array
     *                 items:
     *                   type: object
     *                   required:
     *                     - userId
     *                     - categoryId
     *                     - reason
     *                   properties:
     *                     userId:
     *                       type: string
     *                       format: uuid
     *                       description: ID do usuário
     *                     categoryId:
     *                       type: string
     *                       format: uuid
     *                       description: ID da categoria
     *                     reason:
     *                       type: string
     *                       description: Motivo do cancelamento
     *     responses:
     *       200:
     *         description: Participações canceladas com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StageParticipation'
     *                 errors:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       userId:
     *                         type: string
     *                       categoryId:
     *                         type: string
     *                       error:
     *                         type: string
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/bulk-cancel',
      authMiddleware,
      this.bulkCancelParticipation.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/bulk-confirm:
     *   post:
     *     summary: Confirmar participação em massa de pilotos em uma etapa
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stageId
     *               - confirmations
     *             properties:
     *               stageId:
     *                 type: string
     *                 format: uuid
     *                 description: ID da etapa
     *               confirmations:
     *                 type: array
     *                 items:
     *                   type: object
     *                   required:
     *                     - userId
     *                     - categoryId
     *                   properties:
     *                     userId:
     *                       type: string
     *                       format: uuid
     *                       description: ID do usuário
     *                     categoryId:
     *                       type: string
     *                       format: uuid
     *                       description: ID da categoria
     *     responses:
     *       200:
     *         description: Participações confirmadas com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StageParticipation'
     *                 errors:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       userId:
     *                         type: string
     *                       categoryId:
     *                         type: string
     *                       error:
     *                         type: string
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/bulk-confirm',
      authMiddleware,
      this.bulkConfirmParticipation.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/stage/{stageId}:
     *   get:
     *     summary: Buscar participações de uma etapa específica
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: stageId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     responses:
     *       200:
     *         description: Lista de participações da etapa
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/StageParticipation'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get(
      '/stage/:stageId',
      authMiddleware,
      this.getStageParticipations.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/available-categories/{stageId}:
     *   get:
     *     summary: Buscar categorias disponíveis para o usuário confirmar em uma etapa
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: stageId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     responses:
     *       200:
     *         description: Lista de categorias disponíveis
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       name:
     *                         type: string
     *                       ballast:
     *                         type: string
     *                       isConfirmed:
     *                         type: boolean
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get(
      '/available-categories/:stageId',
      authMiddleware,
      this.getAvailableCategories.bind(this)
    );

    /**
     * @swagger
     * /stage-participations/auto-confirm:
     *   post:
     *     summary: Confirmar participação do usuário logado em uma etapa e categoria via body
     *     tags: [Stage Participations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stageId
     *               - categoryId
     *             properties:
     *               stageId:
     *                 type: string
     *                 format: uuid
     *                 description: ID da etapa
     *               categoryId:
     *                 type: string
     *                 format: uuid
     *                 description: ID da categoria
     *     responses:
     *       200:
     *         description: Participação confirmada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/StageParticipation'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Etapa ou categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/auto-confirm',
      authMiddleware,
      this.autoConfirmParticipation.bind(this)
    );
  }

  private async confirmParticipation(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Se for admin/manager, pode passar userId no body
      let userId = req.user!.id;
      if (
        req.user &&
        (req.user.role === UserRole.ADMINISTRATOR ||
          req.user.role === UserRole.MANAGER)
      ) {
        userId = req.body.userId || req.user.id;
      }

      const { stageId, categoryId } = req.body;

      if (!stageId || !categoryId) {
        throw new BadRequestException('stageId e categoryId são obrigatórios');
      }

      const data: CreateParticipationData = {
        userId,
        stageId,
        categoryId,
      };

      const participation =
        await this.stageParticipationService.confirmParticipation(data);

      res.status(201).json({
        message: 'Participação confirmada com sucesso',
        data: participation,
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error confirming participation:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async cancelParticipation(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Se for admin/manager, pode passar userId no body
      let userId = req.user!.id;
      if (
        req.user &&
        (req.user.role === UserRole.ADMINISTRATOR ||
          req.user.role === UserRole.MANAGER)
      ) {
        userId = req.body.userId || req.user.id;
      }

      const { stageId, categoryId, reason } = req.body;

      if (!stageId || !categoryId) {
        throw new BadRequestException('stageId e categoryId são obrigatórios');
      }

      await this.stageParticipationService.cancelParticipation(
        userId,
        stageId,
        categoryId,
        reason
      );

      res.json({
        message: 'Participação cancelada com sucesso',
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error confirming participation:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getMyParticipations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const participations =
        await this.stageParticipationService.findByUserId(userId);

      res.json({
        message: 'Participações recuperadas com sucesso',
        data: participations,
      });
    } catch (error: any) {
      console.error('Error getting user participations:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getMyUpcomingParticipations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const upcomingParticipations =
        await this.stageParticipationService.findUserUpcomingParticipations(
          userId
        );

      res.json({
        message: 'Próximas participações recuperadas com sucesso',
        data: upcomingParticipations,
      });
    } catch (error: any) {
      console.error('Error getting user upcoming participations:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getStageParticipations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId } = req.params;
      const participations =
        await this.stageParticipationService.findByStageId(stageId);

      res.json({
        message: 'Participações da etapa recuperadas com sucesso',
        data: participations,
      });
    } catch (error: any) {
      console.error('Error getting stage participations:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async bulkConfirmParticipation(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId, confirmations } = req.body;

      if (!stageId || !confirmations || !Array.isArray(confirmations)) {
        throw new BadRequestException(
          'stageId e confirmations (array) são obrigatórios'
        );
      }

      // Bulk confirm permite confirmação de qualquer piloto, ignorando validações de pagamento
      // para facilitar o gerenciamento administrativo

      const results: any[] = [];
      const errors: any[] = [];

      for (const confirmation of confirmations) {
        try {
          const { userId, categoryId } = confirmation;

          if (!userId || !categoryId) {
            errors.push({
              userId,
              categoryId,
              error: 'userId e categoryId são obrigatórios',
            });
            continue;
          }

          const data: CreateParticipationData = {
            userId,
            stageId,
            categoryId,
          };

          // Usar método administrativo que ignora validações de pagamento
          const participation =
            await this.stageParticipationService.confirmParticipationAdmin(
              data
            );
          results.push(participation);
        } catch (error: any) {
          errors.push({
            userId: confirmation.userId,
            categoryId: confirmation.categoryId,
            error: error.message || 'Erro ao confirmar participação',
          });
        }
      }

      res.json({
        message: `Confirmações processadas. ${results.length} confirmadas com sucesso, ${errors.length} com erro.`,
        data: results,
        errors,
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error bulk confirming participation:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async bulkCancelParticipation(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId, cancellations } = req.body;

      if (!stageId || !cancellations || !Array.isArray(cancellations)) {
        throw new BadRequestException(
          'stageId e cancellations (array) são obrigatórios'
        );
      }

      const results: any[] = [];
      const errors: any[] = [];

      for (const cancellation of cancellations) {
        try {
          const { userId, categoryId, reason } = cancellation;

          if (!userId || !categoryId) {
            errors.push({
              userId,
              categoryId,
              error: 'userId e categoryId são obrigatórios',
            });
            continue;
          }

          await this.stageParticipationService.cancelParticipation(
            userId,
            stageId,
            categoryId,
            reason
          );
          results.push({ userId, categoryId, status: 'cancelled' });
        } catch (error: any) {
          errors.push({
            userId: cancellation.userId,
            categoryId: cancellation.categoryId,
            error: error.message || 'Erro ao cancelar participação',
          });
        }
      }

      res.json({
        message: `Cancelamentos processados. ${results.length} cancelados com sucesso, ${errors.length} com erro.`,
        data: results,
        errors,
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error bulk cancelling participation:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getAvailableCategories(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { stageId } = req.params;

      const categories =
        await this.stageParticipationService.getAvailableCategoriesForUser(
          userId,
          stageId
        );

      res.json({
        message: 'Categorias disponíveis recuperadas com sucesso',
        data: categories,
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting available categories:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async autoConfirmParticipation(
    req: Request,
    res: Response
  ): Promise<void> {
    console.log('autoConfirmParticipation');
    try {
      const userId = req.user!.id;
      const { stageId, categoryId } = req.body;
      if (!stageId || !categoryId) {
        throw new BadRequestException('stageId e categoryId são obrigatórios');
      }
      const data: CreateParticipationData = {
        userId,
        stageId: String(stageId),
        categoryId: String(categoryId),
      };

      const participation =
        await this.stageParticipationService.confirmParticipation(data);

      res.json({
        message: 'Participação confirmada com sucesso',
        data: participation,
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }
}
