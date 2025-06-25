import { Router, Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { BaseController } from './base.controller';
import { StageService } from '../services/stage.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ConflictException } from '../exceptions/conflict.exception';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { SeasonService } from '../services/season.service';

/**
 * @swagger
 * components:
 *   schemas:
 *     Stage:
 *       type: object
 *       required:
 *         - name
 *         - date
 *         - time
 *         - kartodrome
 *         - kartodromeAddress
 *         - seasonId
 *         - categoryIds
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da etapa
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Nome da etapa
 *           example: "Etapa 1 - Abertura"
 *         date:
 *           type: string
 *           format: date
 *           description: Data da etapa
 *           example: "2024-03-15"
 *         time:
 *           type: string
 *           description: Horário da etapa (HH:MM)
 *           example: "14:30"
 *         kartodrome:
 *           type: string
 *           maxLength: 255
 *           description: Nome do kartódromo
 *           example: "Kartódromo Granja Viana"
 *         kartodromeAddress:
 *           type: string
 *           description: Endereço completo do kartódromo
 *           example: "Rodovia Raposo Tavares, km 26,5 - Granja Viana, Cotia - SP"
 *         streamLink:
 *           type: string
 *           maxLength: 500
 *           description: Link de transmissão (opcional)
 *           example: "https://youtube.com/watch?v=123"
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *         categoryIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: IDs das categorias participantes

 *         doublePoints:
 *           type: boolean
 *           description: Se a pontuação é em dobro
 *         briefing:
 *           type: string
 *           description: Texto do briefing (opcional)
 *         briefingTime:
 *           type: string
 *           description: Horário do briefing (HH:MM) (opcional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class StageController extends BaseController {
  constructor(
    private stageService: StageService,
    private championshipStaffService: ChampionshipStaffService,
    private seasonService: SeasonService
  ) {
    super('/stages');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /stages:
     *   get:
     *     summary: Listar todas as etapas
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de etapas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Stage'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/', authMiddleware, this.getAllStages.bind(this));

    /**
     * @swagger
     * /stages/{id}:
     *   get:
     *     summary: Buscar etapa por ID
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     responses:
     *       200:
     *         description: Etapa encontrada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/:id', authMiddleware, this.getStageById.bind(this));

    /**
     * @swagger
     * /stages/{id}/with-participants:
     *   get:
     *     summary: Buscar etapa por ID com participantes confirmados
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     responses:
     *       200:
     *         description: Etapa encontrada com participantes
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               allOf:
     *                 - $ref: '#/components/schemas/Stage'
     *                 - type: object
     *                   properties:
     *                     participants:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/StageParticipation'
     *                     participantCount:
     *                       type: number
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/:id/with-participants', authMiddleware, this.getStageByIdWithParticipants.bind(this));

    /**
     * @swagger
     * /stages/season/{seasonId}:
     *   get:
     *     summary: Buscar etapas por temporada
     *     tags: [Stages]
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
     *         description: Etapas encontradas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Stage'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId', authMiddleware, this.getStagesBySeasonId.bind(this));

    /**
     * @swagger
     * /stages/season/{seasonId}/upcoming:
     *   get:
     *     summary: Buscar próximas etapas por temporada
     *     tags: [Stages]
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
     *         description: Próximas etapas encontradas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Stage'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/upcoming', authMiddleware, this.getUpcomingStagesBySeasonId.bind(this));

    /**
     * @swagger
     * /stages/season/{seasonId}/past:
     *   get:
     *     summary: Buscar etapas passadas por temporada
     *     tags: [Stages]
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
     *         description: Etapas passadas encontradas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Stage'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/past', authMiddleware, this.getPastStagesBySeasonId.bind(this));

    /**
     * @swagger
     * /stages/season/{seasonId}/next:
     *   get:
     *     summary: Buscar próxima etapa por temporada
     *     tags: [Stages]
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
     *         description: Próxima etapa encontrada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       404:
     *         description: Nenhuma próxima etapa encontrada
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId/next', authMiddleware, this.getNextStageBySeasonId.bind(this));

    /**
     * @swagger
     * /stages:
     *   post:
     *     summary: Criar nova etapa
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateStageDto'
     *     responses:
     *       201:
     *         description: Etapa criada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Sem permissão para criar etapas
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/', 
      authMiddleware, 
      validationMiddleware(CreateStageDto), 
      this.createStage.bind(this)
    );

    /**
     * @swagger
     * /stages/{id}:
     *   put:
     *     summary: Atualizar etapa
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateStageDto'
     *     responses:
     *       200:
     *         description: Etapa atualizada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Sem permissão para editar etapas
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.put(
      '/:id', 
      authMiddleware, 
      validationMiddleware(UpdateStageDto), 
      this.updateStage.bind(this)
    );

    /**
     * @swagger
     * /stages/{id}:
     *   delete:
     *     summary: Deletar etapa
     *     tags: [Stages]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da etapa
     *     responses:
     *       204:
     *         description: Etapa deletada com sucesso
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Sem permissão para deletar etapas
     *       404:
     *         description: Etapa não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.delete(
      '/:id', 
      authMiddleware, 
      this.deleteStage.bind(this)
    );
  }

  // Route handlers
  private async getAllStages(req: Request, res: Response): Promise<void> {
    try {
      const stages = await this.stageService.findAll();
      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  private async getStageById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stage = await this.stageService.findById(id);
      res.json(stage);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }

  private async getStageByIdWithParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stage = await this.stageService.findByIdWithParticipants(id);
      res.json(stage);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }

  private async getStagesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      console.log('🔍 [STAGE CONTROLLER] Buscando etapas para temporada:', seasonId);
      
      const stages = await this.stageService.findBySeasonId(seasonId);
      console.log('✅ [STAGE CONTROLLER] Etapas encontradas:', {
        count: stages.length,
        stages: stages.map(s => ({ id: s.id, name: s.name, date: s.date }))
      });
      
      res.json(stages);
    } catch (error: any) {
      console.error('❌ [STAGE CONTROLLER] Erro ao buscar etapas:', error);
      res.status(500).json({ message: error.message });
    }
  }

  private async getUpcomingStagesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const stages = await this.stageService.findUpcomingBySeasonId(seasonId);
      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  private async getPastStagesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const stages = await this.stageService.findPastBySeasonId(seasonId);
      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  private async getNextStageBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const stage = await this.stageService.findNextBySeasonId(seasonId);
      
      if (!stage) {
        res.status(404).json({ message: 'Nenhuma próxima etapa encontrada' });
        return;
      }
      
      res.json(stage);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  private async createStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stageData: CreateStageDto = plainToInstance(CreateStageDto, req.body);
      
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('ID do campeonato é obrigatório na criação da etapa.');
      }
      
      const seasonId = stageData.seasonId;

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para criar etapas neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para criar etapas neste campeonato'
        });
        return;
      }

      const newStage = await this.stageService.create(stageData);
      res.status(201).json(newStage);
    } catch (error: any) {
      console.error('Error creating stage:', error);
      if (error instanceof ConflictException) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  private async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const stageData: UpdateStageDto = plainToInstance(UpdateStageDto, req.body);

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('Usuário não autenticado.');
      }

      // Buscar a etapa existente para obter o seasonId
      const existingStage = await this.stageService.findById(id);
      if (!existingStage) {
        res.status(404).json({ message: 'Etapa não encontrada' });
        return;
      }

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(existingStage.seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para editar etapas neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para editar esta etapa'
        });
        return;
      }

      const updatedStage = await this.stageService.update(id, stageData);
      res.status(200).json(updatedStage);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
      next(error);
    }
  }

  private async deleteStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Buscar a etapa existente para obter o seasonId
      const existingStage = await this.stageService.findById(id);
      if (!existingStage) {
        res.status(404).json({ message: 'Etapa não encontrada' });
        return;
      }

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(existingStage.seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para deletar etapas neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para deletar esta etapa'
        });
        return;
      }

      await this.stageService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
      next(error);
    }
  }
} 