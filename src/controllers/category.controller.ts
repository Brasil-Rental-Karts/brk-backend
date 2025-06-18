import { Router, Request, Response, NextFunction } from 'express';
import { BaseController } from './base.controller';
import { CategoryService } from '../services/category.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/category.dto';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { SeasonService } from '../services/season.service';

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *         - ballast
 *         - maxPilots
 *         - batteryQuantity
 *         - startingGridFormat
 *         - minimumAge
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da categoria
 *         name:
 *           type: string
 *           maxLength: 75
 *           description: Nome da categoria
 *           example: "Categoria A"
 *         ballast:
 *           type: string
 *           maxLength: 10
 *           description: Lastro (máscara Kg)
 *           example: "75Kg"
 *         maxPilots:
 *           type: integer
 *           description: Máximo de pilotos
 *           example: 20
 *         batteryQuantity:
 *           type: integer
 *           description: Quantidade de baterias
 *           example: 2
 *         startingGridFormat:
 *           type: string
 *           description: Formato de grid de largada
 *           example: "2x2"
 *         minimumAge:
 *           type: integer
 *           description: Idade mínima
 *           example: 18
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class CategoryController extends BaseController {
  constructor(
    private categoryService: CategoryService,
    private championshipStaffService: ChampionshipStaffService,
    private seasonService: SeasonService
  ) {
    super('/categories');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /categories:
     *   get:
     *     summary: Listar todas as categorias
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de categorias
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Category'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/', authMiddleware, this.getAllCategories.bind(this));

    /**
     * @swagger
     * /categories/{id}:
     *   get:
     *     summary: Buscar categoria por ID
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da categoria
     *     responses:
     *       200:
     *         description: Categoria encontrada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Category'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/:id', authMiddleware, this.getCategoryById.bind(this));

    /**
     * @swagger
     * /categories/name/{name}:
     *   get:
     *     summary: Buscar categorias por nome
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: name
     *         required: true
     *         schema:
     *           type: string
     *         description: Nome da categoria
     *       - in: query
     *         name: seasonId
     *         required: false
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da temporada (opcional - se fornecido, retorna categoria específica da temporada)
     *     responses:
     *       200:
     *         description: Categoria(s) encontrada(s)
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/Category'
     *                 - type: array
     *                   items:
     *                     $ref: '#/components/schemas/Category'
     *       401:
     *         description: Token de acesso inválido
     *       404:
     *         description: Categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/name/:name', authMiddleware, this.getCategoryByName.bind(this));

    /**
     * @swagger
     * /categories/ballast/{ballast}:
     *   get:
     *     summary: Buscar categorias por lastro
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: ballast
     *         required: true
     *         schema:
     *           type: string
     *         description: Lastro das categorias
     *     responses:
     *       200:
     *         description: Categorias encontradas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Category'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/ballast/:ballast', authMiddleware, this.getCategoriesByBallast.bind(this));

    /**
     * @swagger
     * /categories/season/{seasonId}:
     *   get:
     *     summary: Buscar categorias por temporada
     *     tags: [Categories]
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
     *         description: Categorias encontradas
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Category'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/season/:seasonId', authMiddleware, this.getCategoriesBySeasonId.bind(this));

    /**
     * @swagger
     * /categories:
     *   post:
     *     summary: Criar nova categoria
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateCategoryDto'
     *     responses:
     *       201:
     *         description: Categoria criada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Category'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Permissão insuficiente (requer role ADMINISTRATOR ou MANAGER)
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/',
      authMiddleware,
      validationMiddleware(CreateCategoryDto),
      this.createCategory.bind(this)
    );

    /**
     * @swagger
     * /categories/{id}:
     *   put:
     *     summary: Atualizar categoria
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da categoria
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateCategoryDto'
     *     responses:
     *       200:
     *         description: Categoria atualizada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Category'
     *       400:
     *         description: Dados inválidos
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Permissão insuficiente (requer role ADMINISTRATOR ou MANAGER)
     *       404:
     *         description: Categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.put(
      '/:id',
      authMiddleware,
      validationMiddleware(UpdateCategoryDto),
      this.updateCategory.bind(this)
    );

    /**
     * @swagger
     * /categories/{id}:
     *   delete:
     *     summary: Deletar categoria
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID da categoria
     *     responses:
     *       204:
     *         description: Categoria deletada com sucesso
     *       401:
     *         description: Token de acesso inválido
     *       403:
     *         description: Permissão insuficiente (requer role ADMINISTRATOR ou MANAGER)
     *       404:
     *         description: Categoria não encontrada
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.delete(
      '/:id',
      authMiddleware,
      this.deleteCategory.bind(this)
    );
  }

  private async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.findAll();
      res.status(200).json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await this.categoryService.findById(id);

      if (!category) {
        res.status(404).json({ message: 'Categoria não encontrada' });
        return;
      }

      res.status(200).json(category);
    } catch (error) {
      console.error('Erro ao buscar categoria por ID:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getCategoryByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { seasonId } = req.query;

      if (seasonId) {
        // Se seasonId for fornecido, buscar categoria específica da temporada
        const category = await this.categoryService.findByNameAndSeason(name, seasonId as string);
        if (!category) {
          res.status(404).json({ message: 'Categoria não encontrada' });
          return;
        }
        res.status(200).json(category);
      } else {
        // Se seasonId não for fornecido, buscar todas as categorias com esse nome
        const categories = await this.categoryService.findByName(name);
        if (!categories || categories.length === 0) {
          res.status(404).json({ message: 'Categoria não encontrada' });
          return;
        }
        res.status(200).json(categories);
      }
    } catch (error) {
      console.error('Erro ao buscar categoria por nome:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getCategoriesByBallast(req: Request, res: Response): Promise<void> {
    try {
      const { ballast } = req.params;
      const categories = await this.categoryService.findByBallast(ballast);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias por lastro:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getCategoriesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const categories = await this.categoryService.findBySeasonId(seasonId);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias por temporada:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const seasonId = req.body.seasonId;

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para criar categorias neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para criar categorias neste campeonato'
        });
        return;
      }

      const validationErrors = await this.categoryService.validateCategoryData(req.body);
      
      if (validationErrors.length > 0) {
        res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: validationErrors 
        });
        return;
      }

      // Verificar se já existe uma categoria com o mesmo nome na mesma temporada
      const existingCategory = await this.categoryService.findByNameAndSeason(req.body.name, req.body.seasonId);
      if (existingCategory) {
        res.status(400).json({ 
          message: 'Já existe uma categoria com este nome nesta temporada' 
        });
        return;
      }

      const category = await this.categoryService.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      next(error);
    }
  }

  private async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Verificar se a categoria existe
      const existingCategory = await this.categoryService.findById(id);
      if (!existingCategory) {
        res.status(404).json({ message: 'Categoria não encontrada' });
        return;
      }

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(existingCategory.seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para editar categorias neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para editar esta categoria'
        });
        return;
      }
      
      const validationErrors = await this.categoryService.validateCategoryData(req.body, true);
      
      if (validationErrors.length > 0) {
        res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: validationErrors 
        });
        return;
      }

      // Verificar se já existe outra categoria com o mesmo nome na mesma temporada (se o nome foi alterado)
      if (req.body.name && req.body.name !== existingCategory.name) {
        const seasonId = req.body.seasonId || existingCategory.seasonId;
        const categoryWithSameName = await this.categoryService.findByNameAndSeason(req.body.name, seasonId);
        if (categoryWithSameName) {
          res.status(400).json({ 
            message: 'Já existe uma categoria com este nome nesta temporada' 
          });
          return;
        }
      }

      const updatedCategory = await this.categoryService.update(id, req.body);
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const category = await this.categoryService.findById(id);
      if (!category) {
        res.status(404).json({ message: 'Categoria não encontrada' });
        return;
      }

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(category.seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para deletar categorias neste campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para deletar esta categoria'
        });
        return;
      }

      const success = await this.categoryService.delete(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: 'Erro ao deletar categoria' });
      }
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
} 