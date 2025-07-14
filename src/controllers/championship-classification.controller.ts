import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ChampionshipClassificationService } from '../services/championship-classification.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

/**
 * @swagger
 * components:
 *   schemas:
 *     ChampionshipClassification:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID do usuário
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: ID da categoria
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *         championshipId:
 *           type: string
 *           format: uuid
 *           description: ID do campeonato
 *         totalPoints:
 *           type: integer
 *           description: Total de pontos acumulados
 *         totalStages:
 *           type: integer
 *           description: Total de etapas participadas
 *         wins:
 *           type: integer
 *           description: Número de vitórias
 *         podiums:
 *           type: integer
 *           description: Número de pódios (top 3)
 *         polePositions:
 *           type: integer
 *           description: Número de pole positions
 *         fastestLaps:
 *           type: integer
 *           description: Número de voltas mais rápidas
 *         bestPosition:
 *           type: integer
 *           nullable: true
 *           description: Melhor posição alcançada
 *         averagePosition:
 *           type: number
 *           nullable: true
 *           description: Posição média nas etapas
 *         user:
 *           $ref: '#/components/schemas/User'
 *         category:
 *           $ref: '#/components/schemas/Category'
 */

export class ChampionshipClassificationController extends BaseController {
  private classificationService: ChampionshipClassificationService;

  constructor() {
    super('/classification');
    this.classificationService = new ChampionshipClassificationService();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /classification/season/{seasonId}/category/{categoryId}:
     *   get:
     *     summary: Buscar classificação por temporada e categoria
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *       - in: path
     *         name: categoryId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da categoria
     *     responses:
     *       200:
     *         description: Classificação da categoria na temporada
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/ChampionshipClassification'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Temporada ou categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/category/:categoryId', authMiddleware, this.getClassificationBySeasonAndCategory.bind(this));

    /**
     * @swagger
     * /classification/championship/{championshipId}:
     *   get:
     *     summary: Buscar classificação completa do campeonato
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do campeonato
     *     responses:
     *       200:
     *         description: Classificação completa do campeonato
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               additionalProperties:
     *                 type: array
     *                 items:
     *                   $ref: '#/components/schemas/ChampionshipClassification'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Campeonato não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/championship/:championshipId', authMiddleware, this.getClassificationByChampionship.bind(this));

    /**
     * @swagger
     * /classification/user/{userId}/season/{seasonId}/category/{categoryId}:
     *   get:
     *     summary: Buscar classificação específica de um usuário
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do usuário
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *       - in: path
     *         name: categoryId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da categoria
     *     responses:
     *       200:
     *         description: Classificação do usuário
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ChampionshipClassification'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Classificação não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/user/:userId/season/:seasonId/category/:categoryId', authMiddleware, this.getUserClassification.bind(this));

    /**
     * @swagger
     * /classification/season/{seasonId}/recalculate:
     *   post:
     *     summary: Recalcular classificação de uma temporada
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *     responses:
     *       200:
     *         description: Classificação recalculada com sucesso
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Temporada não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/season/:seasonId/recalculate', authMiddleware, this.recalculateSeasonClassification.bind(this));

    /**
     * @swagger
     * /classification/season/{seasonId}/update-cache:
     *   post:
     *     summary: Atualizar cache da classificação de uma temporada
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *     responses:
     *       200:
     *         description: Cache da classificação atualizado com sucesso
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Temporada não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/season/:seasonId/update-cache', authMiddleware, this.updateSeasonClassificationCache.bind(this));

    /**
     * @swagger
     * /classification/season/{seasonId}/optimized:
     *   get:
     *     summary: Buscar classificação otimizada da temporada (dados do Redis)
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *     responses:
     *       200:
     *         description: Classificação da temporada com dados do Redis
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Classificação da temporada recuperada com sucesso"
     *                 data:
     *                   type: object
     *                   properties:
     *                     lastUpdated:
     *                       type: string
     *                       format: date-time
     *                       description: Data da última atualização
     *                     totalCategories:
     *                       type: integer
     *                       description: Total de categorias
     *                     totalPilots:
     *                       type: integer
     *                       description: Total de pilotos
     *                     classificationsByCategory:
     *                       type: object
     *                       additionalProperties:
     *                         type: object
     *                         properties:
     *                           category:
     *                             type: object
     *                             description: Dados da categoria
     *                           pilots:
     *                             type: array
     *                             items:
     *                               $ref: '#/components/schemas/ChampionshipClassification'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Temporada não encontrada ou classificação não disponível
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/optimized', authMiddleware, this.getSeasonClassificationOptimized.bind(this));

    /**
     * @swagger
     * /classification/season/{seasonId}/redis:
     *   get:
     *     summary: Buscar classificação diretamente do Redis (alta performance)
     *     tags: [Classification]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada
     *     responses:
     *       200:
     *         description: Classificação da temporada diretamente do Redis
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Classificação da temporada recuperada do Redis"
     *                 data:
     *                   type: object
     *                   description: Dados da classificação em formato raw do Redis
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Temporada não encontrada ou classificação não disponível
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/redis', authMiddleware, this.getSeasonClassificationFromRedis.bind(this));
  }

  private async getClassificationBySeasonAndCategory(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId, categoryId } = req.params;

      if (!seasonId || !categoryId) {
        throw new BadRequestException('seasonId e categoryId são obrigatórios');
      }

      const classification = await this.classificationService.getClassificationBySeasonAndCategory(seasonId, categoryId);

      res.json({
        message: 'Classificação recuperada com sucesso',
        data: classification
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting classification by season and category:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getClassificationByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;

      if (!championshipId) {
        throw new BadRequestException('championshipId é obrigatório');
      }

      const classification = await this.classificationService.getClassificationByChampionship(championshipId);

      // Converter Map para objeto para JSON
      const classificationObject = Object.fromEntries(classification);

      res.json({
        message: 'Classificação do campeonato recuperada com sucesso',
        data: classificationObject
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting classification by championship:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getUserClassification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, seasonId, categoryId } = req.params;

      if (!userId || !seasonId || !categoryId) {
        throw new BadRequestException('userId, seasonId e categoryId são obrigatórios');
      }

      const classification = await this.classificationService.getUserClassification(userId, seasonId, categoryId);

      if (!classification) {
        res.status(404).json({ message: 'Classificação não encontrada para este usuário' });
        return;
      }

      res.json({
        message: 'Classificação do usuário recuperada com sucesso',
        data: classification
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting user classification:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async recalculateSeasonClassification(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const userId = req.user?.id;

      if (!seasonId) {
        throw new BadRequestException('seasonId é obrigatório');
      }

      if (!userId) {
        throw new BadRequestException('Usuário não autenticado');
      }

      // TODO: Adicionar verificação de permissão (apenas admins/managers do campeonato)
      // await this.validateChampionshipPermission(championshipId, userId);

      await this.classificationService.recalculateSeasonClassification(seasonId);

      res.json({
        message: 'Classificação da temporada recalculada com sucesso'
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error recalculating season classification:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getSeasonClassificationOptimized(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;

      if (!seasonId) {
        throw new BadRequestException('seasonId é obrigatório');
      }

      const classification = await this.classificationService.getSeasonClassificationOptimized(seasonId);

      res.json({
        message: 'Classificação da temporada recuperada com sucesso',
        data: classification
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting season classification optimized:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getSeasonClassificationFromRedis(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;

      if (!seasonId) {
        throw new BadRequestException('seasonId é obrigatório');
      }

      const classification = await this.classificationService.getSeasonClassificationFromCache(seasonId);

      res.json({
        message: 'Classificação da temporada recuperada do Redis',
        data: classification
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting season classification from Redis:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async updateSeasonClassificationCache(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const userId = req.user?.id;

      if (!seasonId) {
        throw new BadRequestException('seasonId é obrigatório');
      }

      if (!userId) {
        throw new BadRequestException('Usuário não autenticado');
      }

      // TODO: Adicionar verificação de permissão (apenas admins/managers do campeonato)
      // await this.validateChampionshipPermission(championshipId, userId);

      await this.classificationService.cacheSeasonClassificationInRedis(seasonId);

      res.json({
        message: 'Cache da classificação da temporada atualizado com sucesso'
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error updating season classification cache:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }
} 