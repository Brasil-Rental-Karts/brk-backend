import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { GridTypeService } from '../services/grid-type.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { CreateGridTypeDto, UpdateGridTypeDto } from '../dtos/grid-type.dto';
import { UserRole } from '../models/user.entity';
import { ChampionshipStaffService } from '../services/championship-staff.service';

export class GridTypeController extends BaseController {
  private gridTypeService: GridTypeService;
  private championshipStaffService: ChampionshipStaffService;

  constructor(championshipStaffService: ChampionshipStaffService) {
    super('/');
    this.gridTypeService = new GridTypeService();
    this.championshipStaffService = championshipStaffService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    /**
     * @swagger
     * /championships/{championshipId}/grid-types:
     *   get:
     *     summary: Listar tipos de grid de um campeonato
     *     tags: [GridTypes]
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
     *         description: Lista de tipos de grid
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/GridType'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/championships/:championshipId/grid-types', authMiddleware, this.getByChampionship.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types/predefined:
     *   post:
     *     summary: Criar tipos de grid pré-definidos
     *     tags: [GridTypes]
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
     *       201:
     *         description: Tipos de grid pré-definidos criados com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/GridType'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/championships/:championshipId/grid-types/predefined', authMiddleware, this.createPredefined.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types:
     *   post:
     *     summary: Criar novo tipo de grid
     *     tags: [GridTypes]
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
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateGridTypeDto'
     *     responses:
     *       201:
     *         description: Tipo de grid criado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GridType'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/championships/:championshipId/grid-types', authMiddleware, validationMiddleware(CreateGridTypeDto), this.create.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types/{id}:
     *   put:
     *     summary: Atualizar tipo de grid
     *     tags: [GridTypes]
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
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do tipo de grid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateGridTypeDto'
     *     responses:
     *       200:
     *         description: Tipo de grid atualizado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GridType'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Tipo de grid não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.put('/championships/:championshipId/grid-types/:id', authMiddleware, validationMiddleware(UpdateGridTypeDto), this.update.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types/{id}:
     *   delete:
     *     summary: Deletar tipo de grid
     *     tags: [GridTypes]
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
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do tipo de grid
     *     responses:
     *       204:
     *         description: Tipo de grid deletado com sucesso
     *       400:
     *         description: Não é possível deletar este tipo de grid
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Tipo de grid não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.delete('/championships/:championshipId/grid-types/:id', authMiddleware, this.delete.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types/{id}/toggle-active:
     *   patch:
     *     summary: Ativar/desativar tipo de grid
     *     tags: [GridTypes]
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
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do tipo de grid
     *     responses:
     *       200:
     *         description: Status do tipo de grid alterado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GridType'
     *       400:
     *         description: Não é possível desativar o último tipo de grid ativo
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Tipo de grid não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.patch('/championships/:championshipId/grid-types/:id/toggle-active', authMiddleware, this.activate.bind(this));

    /**
     * @swagger
     * /championships/{championshipId}/grid-types/{id}/set-default:
     *   patch:
     *     summary: Definir tipo de grid como padrão
     *     tags: [GridTypes]
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
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do tipo de grid
     *     responses:
     *       200:
     *         description: Tipo de grid definido como padrão com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GridType'
     *       400:
     *         description: Não é possível definir um tipo de grid inativo como padrão
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Tipo de grid não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.patch('/championships/:championshipId/grid-types/:id/set-default', authMiddleware, this.setAsDefault.bind(this));
  }

  private async getByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const gridTypes = await this.gridTypeService.findByChampionship(championshipId);
      res.json(gridTypes);
    } catch (error: any) {
      console.error('Error getting grid types:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async createPredefined(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para gerenciar tipos de grid neste campeonato'
        });
        return;
      }

      const gridTypes = await this.gridTypeService.createPredefined(championshipId);
      res.status(201).json(gridTypes);
    } catch (error: any) {
      console.error('Error creating predefined grid types:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para criar tipos de grid neste campeonato'
        });
        return;
      }

      const createDto: CreateGridTypeDto = req.body;
      const gridType = await this.gridTypeService.create(championshipId, createDto);
      res.status(201).json(gridType);
    } catch (error: any) {
      console.error('Error creating grid type:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para editar tipos de grid neste campeonato'
        });
        return;
      }

      const updateDto: UpdateGridTypeDto = req.body;
      const gridType = await this.gridTypeService.update(id, championshipId, updateDto);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error updating grid type:', error);
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para deletar tipos de grid neste campeonato'
        });
        return;
      }

      await this.gridTypeService.delete(id, championshipId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting grid type:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível excluir o único tipo de grid. Pelo menos um tipo deve existir.') {
        res.status(400).json({ message: error.message });
      } else if (error.message === 'Não é possível excluir o último tipo de grid ativo') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para gerenciar tipos de grid neste campeonato'
        });
        return;
      }

      const gridType = await this.gridTypeService.toggleActive(id, championshipId);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error activating grid type:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível desativar o último tipo de grid ativo') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async setAsDefault(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para gerenciar este campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para gerenciar tipos de grid neste campeonato'
        });
        return;
      }

      const gridType = await this.gridTypeService.setAsDefault(id, championshipId);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error setting grid type as default:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível definir um tipo de grid inativo como padrão') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }
} 