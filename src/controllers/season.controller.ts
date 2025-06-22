import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SeasonService } from '../services/season.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { Season, SeasonStatus, InscriptionType, PaymentMethod } from '../models/season.entity';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ChampionshipStaffService } from '../services/championship-staff.service';

/**
 * @swagger
 * components:
 *   schemas:
 *     Season:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - startDate
 *         - endDate
 *         - inscriptionValue
 *         - inscriptionType
 *         - paymentMethods
 *         - championshipId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da temporada
 *         name:
 *           type: string
 *           maxLength: 75
 *           description: Nome da temporada
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Descrição da temporada
 *         startDate:
 *           type: string
 *           format: date
 *           example: "2025-03-15"
 *           description: Data de início da temporada (formato YYYY-MM-DD)
 *         endDate:
 *           type: string
 *           format: date
 *           example: "2025-12-20"
 *           description: Data de fim da temporada (formato YYYY-MM-DD)
 *         status:
 *           type: string
 *           enum: [agendado, em_andamento, cancelado, finalizado]
 *           description: Status da temporada
 *         registrationOpen:
 *           type: boolean
 *           default: true
 *           description: Indica se as inscrições estão abertas para esta temporada
 *         inscriptionValue:
 *           type: number
 *           description: Valor da inscrição
 *         inscriptionType:
 *           type: string
 *           enum: [por_temporada, por_etapa]
 *           description: Tipo da inscrição
 *         paymentMethods:
 *           type: array
 *           items:
 *             type: string
    *             enum: [pix, cartao_credito]
 *           description: Métodos de pagamento aceitos
 *         championshipId:
 *           type: string
 *           format: uuid
 *           description: ID do campeonato
 *         pixInstallments:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           maximum: 12
 *           description: Número máximo de parcelas para pagamento via PIX
 *         creditCardInstallments:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           maximum: 12
 *           description: Número máximo de parcelas para pagamento via cartão de crédito

 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class SeasonController extends BaseController {
  constructor(
    private seasonService: SeasonService,
    private championshipStaffService: ChampionshipStaffService
  ) {
    super('/seasons');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /seasons:
     *   get:
     *     summary: Listar todas as temporadas com paginação
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Número da página
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Itens por página
     *     responses:
     *       200:
     *         description: Lista paginada de temporadas
     */
    this.router.get('/', authMiddleware, this.getAllSeasons.bind(this));

    /**
     * @swagger
     * /seasons/championship/{championshipId}:
     *   get:
     *     summary: Listar temporadas de um campeonato específico
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *     responses:
     *       200:
     *         description: Lista paginada de temporadas do campeonato
     */
    this.router.get('/championship/:championshipId', authMiddleware, this.getSeasonsByChampionship.bind(this));

    /**
     * @swagger
     * /seasons/{id}:
     *   get:
     *     summary: Buscar temporada por ID
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Temporada encontrada
     *       404:
     *         description: Temporada não encontrada
     */
    this.router.get('/:id', authMiddleware, this.getSeasonById.bind(this));

    /**
     * @swagger
     * /seasons:
     *   post:
     *     summary: Criar nova temporada
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Season'
     *     responses:
     *       201:
     *         description: Temporada criada com sucesso
     *       400:
     *         description: Dados inválidos
     */
    this.router.post('/', authMiddleware, this.createSeason.bind(this));

    /**
     * @swagger
     * /seasons/{id}:
     *   put:
     *     summary: Atualizar temporada
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Season'
     *     responses:
     *       200:
     *         description: Temporada atualizada com sucesso
     *       404:
     *         description: Temporada não encontrada
     */
    this.router.put('/:id', authMiddleware, this.updateSeason.bind(this));

    /**
     * @swagger
     * /seasons/{id}:
     *   delete:
     *     summary: Deletar temporada
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Temporada deletada com sucesso
     *       404:
     *         description: Temporada não encontrada
     */
    this.router.delete('/:id', authMiddleware, this.deleteSeason.bind(this));

    /**
     * @swagger
     * /seasons/{id}/refresh-cache:
     *   post:
     *     summary: Forçar atualização do cache da temporada
     *     tags: [Seasons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Cache atualizado com sucesso
     *       404:
     *         description: Temporada não encontrada
     */
    this.router.post('/:id/refresh-cache', authMiddleware, this.refreshSeasonCache.bind(this));
  }

  private async getAllSeasons(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const seasons = await this.seasonService.findAllPaginated(page, limit);
      res.status(200).json(seasons);
    } catch (error: any) {
      res.status(500).json({ message: 'Erro ao listar temporadas', details: error.message });
    }
  }

  private async getSeasonsByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const seasons = await this.seasonService.findByChampionshipId(championshipId, page, limit);
      res.status(200).json(seasons);
    } catch (error: any) {
      res.status(500).json({ message: 'Erro ao listar temporadas do campeonato', details: error.message });
    }
  }

  private async getSeasonById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const season = await this.seasonService.findBySlugOrId(id);
      if (!season) {
        throw new NotFoundException('Temporada não encontrada');
      }
      res.status(200).json(season);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao buscar temporada', details: error.message });
      }
    }
  }

  private async createSeason(req: Request, res: Response): Promise<void> {
    try {
      this.validateSeasonData(req.body);
      const userId = req.user!.id;
      const championshipId = req.body.championshipId;

      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para criar uma temporada neste campeonato.',
          details: 'Apenas administradores do sistema ou staff do campeonato podem realizar esta ação.'
        });
        return;
      }

      const seasonData: Partial<Season> = {
        name: req.body.name,
        description: req.body.description,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: req.body.status || SeasonStatus.AGENDADO,
        registrationOpen: req.body.registrationOpen !== undefined ? req.body.registrationOpen : true,
        inscriptionValue: parseFloat(req.body.inscriptionValue),
        inscriptionType: req.body.inscriptionType,
        paymentMethods: req.body.paymentMethods,
        championshipId: req.body.championshipId,
        pixInstallments: req.body.pixInstallments || 1,
        creditCardInstallments: req.body.creditCardInstallments || 1,

      };

      const season = await this.seasonService.create(seasonData);
      res.status(201).json(season);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao criar temporada', details: error.message });
      }
    }
  }

  private async updateSeason(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      this.validateSeasonData(req.body, false);

      const existingSeason = await this.seasonService.findById(id);
      if (!existingSeason) {
        throw new NotFoundException('Temporada não encontrada');
      }

      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, existingSeason.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para atualizar esta temporada.',
          details: 'Apenas administradores do sistema ou staff do campeonato podem realizar esta ação.'
        });
        return;
      }

      const seasonData: Partial<Season> = {};

      if (req.body.name) seasonData.name = req.body.name;
      if (req.body.description) seasonData.description = req.body.description;
      if (req.body.startDate) seasonData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) seasonData.endDate = new Date(req.body.endDate);
      if (req.body.status) seasonData.status = req.body.status;
      if (req.body.registrationOpen !== undefined) seasonData.registrationOpen = req.body.registrationOpen;
      if (req.body.inscriptionValue) seasonData.inscriptionValue = parseFloat(req.body.inscriptionValue);
      if (req.body.inscriptionType) seasonData.inscriptionType = req.body.inscriptionType;
      if (req.body.paymentMethods) seasonData.paymentMethods = req.body.paymentMethods;
      if (req.body.pixInstallments !== undefined) seasonData.pixInstallments = req.body.pixInstallments;
      if (req.body.creditCardInstallments !== undefined) seasonData.creditCardInstallments = req.body.creditCardInstallments;


      const season = await this.seasonService.update(id, seasonData);

      if (!season) {
        throw new NotFoundException('Temporada não encontrada');
      }
      res.status(200).json(season);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao atualizar temporada', details: error.message });
      }
    }
  }

  private async deleteSeason(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const existingSeason = await this.seasonService.findById(id);
      if (!existingSeason) {
        throw new NotFoundException('Temporada não encontrada');
      }

      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, existingSeason.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para deletar esta temporada.',
          details: 'Apenas administradores do sistema ou staff do campeonato podem realizar esta ação.'
        });
        return;
      }

      await this.seasonService.delete(id);
      res.status(200).json({ message: 'Temporada deletada com sucesso' });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao deletar temporada', details: error.message });
      }
    }
  }

  private async refreshSeasonCache(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const existingSeason = await this.seasonService.findById(id);
      if (!existingSeason) {
        throw new NotFoundException('Temporada não encontrada');
      }

      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, existingSeason.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para atualizar o cache desta temporada.',
          details: 'Apenas administradores do sistema ou staff do campeonato podem realizar esta ação.'
        });
        return;
      }

      const success = await this.seasonService.refreshSeasonCache(id);
      if (!success) {
        res.status(500).json({ message: 'Erro ao atualizar cache da temporada' });
        return;
      }

      res.status(200).json({ 
        message: 'Cache da temporada atualizado com sucesso',
        season: {
          id: existingSeason.id,
          name: existingSeason.name,
          registrationOpen: existingSeason.registrationOpen
        }
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao atualizar cache da temporada', details: error.message });
      }
    }
  }

  private validateSeasonData(data: any, isCreate: boolean = true): void {
    const requiredFieldsCreate: string[] = [
      'name', 'description', 'startDate', 'endDate', 
      'inscriptionValue', 'inscriptionType', 'paymentMethods', 'championshipId'
    ];
  
    if (isCreate) {
      for (const field of requiredFieldsCreate) {
        if (data[field] === undefined || data[field] === null || (typeof data[field] === 'string' && data[field].trim() === '')) {
          throw new BadRequestException(`${field} é obrigatório`);
        }
      }
    }
  
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.length > 75)) {
      throw new BadRequestException('Nome da temporada inválido ou excede 75 caracteres.');
    }
    
    if (data.description !== undefined && (typeof data.description !== 'string' || data.description.length > 1000)) {
      throw new BadRequestException('Descrição da temporada inválida ou excede 1000 caracteres.');
    }
  
    // Validação de parcelamento por método de pagamento
    if (data.pixInstallments !== undefined && (typeof data.pixInstallments !== 'number' || data.pixInstallments < 1 || data.pixInstallments > 12)) {
      throw new BadRequestException('Número de parcelas PIX deve ser entre 1 e 12.');
    }
  
    if (data.creditCardInstallments !== undefined && (typeof data.creditCardInstallments !== 'number' || data.creditCardInstallments < 1 || data.creditCardInstallments > 12)) {
      throw new BadRequestException('Número de parcelas do cartão de crédito deve ser entre 1 e 12.');
    }
  

  
    if (data.startDate !== undefined && isNaN(new Date(data.startDate).getTime())) {
      throw new BadRequestException('Data de início inválida. Use o formato YYYY-MM-DD');
    }
  
    if (data.endDate !== undefined && isNaN(new Date(data.endDate).getTime())) {
      throw new BadRequestException('Data de fim inválida. Use o formato YYYY-MM-DD');
    }
  
    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }
  
    const minDate = new Date('2020-01-01');
    const maxDate = new Date('2050-12-31');
    if (data.startDate && (new Date(data.startDate) < minDate || new Date(data.startDate) > maxDate)) {
      throw new BadRequestException('Data de início deve estar entre 2020 e 2050');
    }
  
    if (data.endDate && (new Date(data.endDate) < minDate || new Date(data.endDate) > maxDate)) {
      throw new BadRequestException('Data de fim deve estar entre 2020 e 2050');
    }
  
    if (data.status && !Object.values(SeasonStatus).includes(data.status)) {
      throw new BadRequestException('Status inválido');
    }
  
    if (data.inscriptionValue !== undefined && isNaN(parseFloat(data.inscriptionValue))) {
      throw new BadRequestException('Valor da inscrição deve ser um número válido');
    }
  
    if (data.inscriptionType && !Object.values(InscriptionType).includes(data.inscriptionType)) {
      throw new BadRequestException('Tipo de inscrição inválido');
    }
  
    if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
      if (data.paymentMethods.length === 0 && isCreate) {
        throw new BadRequestException('Métodos de pagamento são obrigatórios');
      }
      for (const method of data.paymentMethods) {
        if (!Object.values(PaymentMethod).includes(method)) {
          throw new BadRequestException(`Método de pagamento inválido: ${method}`);
        }
      }
    } else if (isCreate) {
      throw new BadRequestException('Métodos de pagamento são obrigatórios e devem ser um array');
    }
  }
} 