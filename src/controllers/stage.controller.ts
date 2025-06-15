import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { StageService } from '../services/stage.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

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
  constructor(private stageService: StageService) {
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
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), 
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
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), 
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
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), 
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

  private async getStagesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const stages = await this.stageService.findBySeasonId(seasonId);
      res.json(stages);
    } catch (error: any) {
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

  private async createStage(req: Request, res: Response): Promise<void> {
    try {
      const createStageDto: CreateStageDto = req.body;
      const stage = await this.stageService.create(createStageDto);
      res.status(201).json(stage);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }

  private async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateStageDto: UpdateStageDto = req.body;
      const stage = await this.stageService.update(id, updateStageDto);
      res.json(stage);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }

  private async deleteStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
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
    }
  }
} 