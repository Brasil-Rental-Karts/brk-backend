import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ScoringSystemService, CreateScoringSystemDto, UpdateScoringSystemDto } from '../services/scoring-system.service';
import { ChampionshipService } from '../services/championship.service';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';

/**
 * @swagger
 * components:
 *   schemas:
 *     ScoringSystem:
 *       type: object
 *       required:
 *         - name
 *         - positions
 *         - championshipId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único do sistema de pontuação
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nome do sistema de pontuação
 *         description:
 *           type: string
 *           description: Descrição do sistema de pontuação
 *         positions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               position:
 *                 type: integer
 *                 minimum: 1
 *               points:
 *                 type: number
 *                 minimum: 0
 *           description: Configuração de pontos por posição
 *         polePositionPoints:
 *           type: number
 *           minimum: 0
 *           default: 0
 *           description: Pontos extras para pole position
 *         fastestLapPoints:
 *           type: number
 *           minimum: 0
 *           default: 0
 *           description: Pontos extras para volta mais rápida
 *         leaderLapPoints:
 *           type: number
 *           minimum: 0
 *           default: 0
 *           description: Pontos extras por volta liderada
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Se o sistema está ativo
 *         isDefault:
 *           type: boolean
 *           default: false
 *           description: Se é o sistema padrão do campeonato
 *         championshipId:
 *           type: string
 *           format: uuid
 *           description: ID do campeonato
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class ScoringSystemController extends BaseController {
  constructor(
    private scoringSystemService: ScoringSystemService,
    private championshipService: ChampionshipService,
    private championshipStaffService: ChampionshipStaffService
  ) {
    super('/scoring-systems');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /scoring-systems/championship/{championshipId}:
     *   get:
     *     summary: Listar sistemas de pontuação de um campeonato
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Lista de sistemas de pontuação
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.get('/championship/:championshipId', authMiddleware, this.getByChampionship.bind(this));

    /**
     * @swagger
     * /scoring-systems/{id}/championship/{championshipId}:
     *   get:
     *     summary: Buscar sistema de pontuação por ID
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Sistema de pontuação encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.get('/:id/championship/:championshipId', authMiddleware, this.getById.bind(this));

    /**
     * @swagger
     * /scoring-systems/championship/{championshipId}:
     *   post:
     *     summary: Criar novo sistema de pontuação
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - positions
     *             properties:
     *               name:
     *                 type: string
     *                 maxLength: 100
     *               description:
     *                 type: string
     *               positions:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     position:
     *                       type: integer
     *                       minimum: 1
     *                     points:
     *                       type: number
     *                       minimum: 0
     *               polePositionPoints:
     *                 type: number
     *                 minimum: 0
     *               fastestLapPoints:
     *                 type: number
     *                 minimum: 0
     *               leaderLapPoints:
     *                 type: number
     *                 minimum: 0
     *               isActive:
     *                 type: boolean
     *               isDefault:
     *                 type: boolean
     *     responses:
     *       201:
     *         description: Sistema de pontuação criado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.post('/championship/:championshipId', authMiddleware, this.create.bind(this));

    /**
     * @swagger
     * /scoring-systems/{id}/championship/{championshipId}:
     *   put:
     *     summary: Atualizar sistema de pontuação
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 maxLength: 100
     *               description:
     *                 type: string
     *               positions:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     position:
     *                       type: integer
     *                       minimum: 1
     *                     points:
     *                       type: number
     *                       minimum: 0
     *               polePositionPoints:
     *                 type: number
     *                 minimum: 0
     *               fastestLapPoints:
     *                 type: number
     *                 minimum: 0
     *               leaderLapPoints:
     *                 type: number
     *                 minimum: 0
     *               isActive:
     *                 type: boolean
     *               isDefault:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Sistema de pontuação atualizado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.put('/:id/championship/:championshipId', authMiddleware, this.update.bind(this));

    /**
     * @swagger
     * /scoring-systems/{id}/championship/{championshipId}:
     *   delete:
     *     summary: Excluir sistema de pontuação
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       204:
     *         description: Sistema de pontuação excluído
     */
    this.router.delete('/:id/championship/:championshipId', authMiddleware, this.delete.bind(this));

    /**
     * @swagger
     * /scoring-systems/{id}/championship/{championshipId}/set-default:
     *   patch:
     *     summary: Definir sistema como padrão
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Sistema definido como padrão
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.patch('/:id/championship/:championshipId/set-default', authMiddleware, this.setAsDefault.bind(this));

    /**
     * @swagger
     * /scoring-systems/{id}/championship/{championshipId}/toggle-active:
     *   patch:
     *     summary: Ativar/desativar sistema de pontuação
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Status do sistema alterado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.patch('/:id/championship/:championshipId/toggle-active', authMiddleware, this.toggleActive.bind(this));

    /**
     * @swagger
     * /scoring-systems/championship/{championshipId}/create-predefined:
     *   post:
     *     summary: Criar sistemas de pontuação pré-configurados
     *     tags: [ScoringSystem]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       201:
     *         description: Sistemas pré-configurados criados
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/ScoringSystem'
     */
    this.router.post('/championship/:championshipId/create-predefined', authMiddleware, this.createPredefined.bind(this));
  }

  private async getByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystems = await this.scoringSystemService.findByChampionship(championshipId);

      res.json(scoringSystems);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystem = await this.scoringSystemService.findById(id, championshipId);

      res.json(scoringSystem);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystemData: CreateScoringSystemDto = req.body;
      
      // Validar dados obrigatórios
      if (!scoringSystemData.name || !scoringSystemData.positions) {
        throw new BadRequestException('Nome e configuração de posições são obrigatórios');
      }

      const scoringSystem = await this.scoringSystemService.create(championshipId, scoringSystemData);

      res.status(201).json(scoringSystem);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystemData: UpdateScoringSystemDto = req.body;
      const scoringSystem = await this.scoringSystemService.update(id, championshipId, scoringSystemData);

      res.json(scoringSystem);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      await this.scoringSystemService.delete(id, championshipId);

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async setAsDefault(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystem = await this.scoringSystemService.setAsDefault(id, championshipId);

      res.json(scoringSystem);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystem = await this.scoringSystemService.toggleActive(id, championshipId);

      res.json(scoringSystem);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async createPredefined(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException('Usuário não identificado');
      }

      // Verificar se o usuário é proprietário do campeonato
      await this.validateChampionshipPermission(championshipId, userId);

      const scoringSystems = await this.scoringSystemService.createPredefined(championshipId);

      res.status(201).json(scoringSystems);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async validateChampionshipPermission(championshipId: string, userId: string): Promise<void> {
    try {
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        throw new ForbiddenException('Você não tem permissão para gerenciar este campeonato');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException('Campeonato não encontrado');
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Scoring System Controller Error:', error);

    if (error instanceof BadRequestException) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof NotFoundException) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof ForbiddenException) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
} 