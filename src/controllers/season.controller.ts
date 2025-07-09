import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SeasonService } from '../services/season.service';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { ChampionshipService } from '../services/championship.service';
import { Season, SeasonStatus, InscriptionType, PaymentMethod, PaymentCondition } from '../models/season.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Controller para gerenciar temporadas
 * 
 * Endpoints disponíveis:
 * - GET /seasons - Lista todas as temporadas
 * - GET /seasons/championship/:championshipId - Lista temporadas de um campeonato
 * - GET /seasons/:id - Busca uma temporada específica
 * - POST /seasons - Cria uma nova temporada
 * - PUT /seasons/:id - Atualiza uma temporada
 * - DELETE /seasons/:id - Remove uma temporada
 * - POST /seasons/:id/refresh-cache - Atualiza cache da temporada
 * 
 * Validações:
 * - name: deve ter entre 3 e 75 caracteres
 * - description: deve ter entre 10 e 1000 caracteres
 * - startDate: deve ser uma data válida
 * - endDate: deve ser uma data válida e posterior ao startDate
 * - status: deve ser um valor válido do enum SeasonStatus
 * - championshipId: deve ser um UUID válido
 * - paymentConditions: deve ser um array válido de condições de pagamento
 * - paymentMethods: deve ser um array com pelo menos um método válido
 * - inscriptionValue: deve ser um número positivo
 */

export class SeasonController extends BaseController {
  constructor(
    private seasonService: SeasonService,
    private championshipStaffService: ChampionshipStaffService,
    private championshipService: ChampionshipService
  ) {
    super('/seasons');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    // Rotas públicas
    this.router.get('/', this.getAllSeasons.bind(this));
    this.router.get('/championship/:championshipId', this.getSeasonsByChampionship.bind(this));
    this.router.get('/:id', this.getSeasonById.bind(this));

    // Rotas protegidas
    this.router.post('/', authMiddleware, this.createSeason.bind(this));
    this.router.put('/:id', authMiddleware, this.updateSeason.bind(this));
    this.router.delete('/:id', authMiddleware, this.deleteSeason.bind(this));
    this.router.post('/:id/refresh-cache', authMiddleware, this.refreshSeasonCache.bind(this));
  }

  private async getAllSeasons(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const seasons = await this.seasonService.findAllPaginated(page, limit);
      res.status(200).json(seasons);
    } catch (error: any) {
      res.status(500).json({ message: 'Erro ao buscar temporadas', details: error.message });
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
      res.status(500).json({ message: 'Erro ao buscar temporadas do campeonato', details: error.message });
    }
  }

  private async getSeasonById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const season = await this.seasonService.findBySlugOrId(id);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }
      res.status(200).json(season);
    } catch (error: any) {
      res.status(500).json({ message: 'Erro ao buscar temporada', details: error.message });
    }
  }

  private async createSeason(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      this.validateSeasonData(req.body, true);

      // Verificar permissões
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, req.body.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para criar temporadas neste campeonato.',
          details: 'Apenas administradores do sistema ou staff do campeonato podem realizar esta ação.'
        });
        return;
      }

      // Verificar se está tentando abrir as inscrições e se o Wallet ID está configurado
      const registrationOpen = req.body.registrationOpen !== false;
      if (registrationOpen) {
        const championship = await this.championshipService.findById(req.body.championshipId);
        if (!championship) {
          throw new NotFoundException('Campeonato não encontrado');
        }

        if (championship.splitEnabled && !championship.asaasWalletId) {
          throw new BadRequestException(
            'Não é possível abrir as inscrições sem configurar o Wallet ID do Asaas. ' +
            'Configure a conta Asaas em Configurações > Conta Asaas.'
          );
        }
      }

      // Processar paymentConditions
      let paymentConditions: PaymentCondition[] = [];

      if (req.body.paymentConditions && Array.isArray(req.body.paymentConditions)) {
        paymentConditions = req.body.paymentConditions.map((condition: any) => ({
          type: condition.type,
          value: parseFloat(condition.value),
          description: condition.description || '',
          enabled: condition.enabled !== false,
          paymentMethods: condition.paymentMethods || [],
          pixInstallments: condition.pixInstallments || 1,
          creditCardInstallments: condition.creditCardInstallments || 1
        }));
      }

      const seasonData: Partial<Season> = {
        name: req.body.name,
        description: req.body.description,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: req.body.status || SeasonStatus.AGENDADO,
        registrationOpen: registrationOpen,
        paymentConditions: paymentConditions,
        championshipId: req.body.championshipId,
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

      const existingSeason = await this.seasonService.findBySlugOrId(id);
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

      // Verificar se está tentando abrir as inscrições e se o Wallet ID está configurado
      if (req.body.registrationOpen === true && !existingSeason.registrationOpen) {
        const championship = await this.championshipService.findById(existingSeason.championshipId);
        if (!championship) {
          throw new NotFoundException('Campeonato não encontrado');
        }

        if (championship.splitEnabled && !championship.asaasWalletId) {
          throw new BadRequestException(
            'Não é possível abrir as inscrições sem configurar o Wallet ID do Asaas. ' +
            'Configure a conta Asaas em Configurações > Conta Asaas.'
          );
        }
      }

      const seasonData: Partial<Season> = {};

      if (req.body.name) seasonData.name = req.body.name;
      if (req.body.description) seasonData.description = req.body.description;
      if (req.body.startDate) seasonData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) seasonData.endDate = new Date(req.body.endDate);
      if (req.body.status) seasonData.status = req.body.status;
      if (req.body.registrationOpen !== undefined) seasonData.registrationOpen = req.body.registrationOpen;
      if (req.body.regulationsEnabled !== undefined) seasonData.regulationsEnabled = req.body.regulationsEnabled;

      // Processar paymentConditions se fornecido
      if (req.body.paymentConditions && Array.isArray(req.body.paymentConditions)) {
        seasonData.paymentConditions = req.body.paymentConditions.map((condition: any) => ({
          type: condition.type,
          value: parseFloat(condition.value),
          description: condition.description || '',
          enabled: condition.enabled !== false,
          paymentMethods: condition.paymentMethods || [],
          pixInstallments: condition.pixInstallments || 1,
          creditCardInstallments: condition.creditCardInstallments || 1
        }));
      }

      const season = await this.seasonService.update(existingSeason.id, seasonData);

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

      const existingSeason = await this.seasonService.findBySlugOrId(id);
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

      await this.seasonService.delete(existingSeason.id);
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

      const existingSeason = await this.seasonService.findBySlugOrId(id);
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

      const success = await this.seasonService.refreshSeasonCache(existingSeason.id);
      if (!success) {
        res.status(500).json({ message: 'Erro ao atualizar cache da temporada' });
        return;
      }

      res.status(200).json({ message: 'Cache da temporada atualizado com sucesso' });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro ao atualizar cache da temporada', details: error.message });
      }
    }
  }

  private validateSeasonData(data: any, isCreate: boolean = true): void {
    const requiredFields = ['name', 'description', 'startDate', 'endDate', 'championshipId'];
    const optionalFields = ['status', 'registrationOpen', 'regulationsEnabled', 'paymentConditions'];

    // Validar campos obrigatórios
    for (const field of requiredFields) {
      if (isCreate && (!data[field] || data[field].toString().trim() === '')) {
        throw new BadRequestException(`Campo obrigatório: ${field}`);
      }
    }

    // Validar nome
    if (data.name && (data.name.length < 3 || data.name.length > 75)) {
      throw new BadRequestException('Nome deve ter entre 3 e 75 caracteres');
    }

    // Validar descrição
    if (data.description && (data.description.length < 10 || data.description.length > 1000)) {
      throw new BadRequestException('Descrição deve ter entre 10 e 1000 caracteres');
    }

    // Validar datas
    if (data.startDate) {
      const startDate = new Date(data.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Data de início inválida');
      }
    }

    if (data.endDate) {
      const endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Data de fim inválida');
      }
    }

    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('Data de fim deve ser posterior à data de início');
      }
    }

    // Validar status
    if (data.status && !Object.values(SeasonStatus).includes(data.status)) {
      throw new BadRequestException('Status inválido');
    }

    // Validar championshipId (UUID)
    if (data.championshipId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.championshipId)) {
      throw new BadRequestException('ID do campeonato inválido');
    }

    // Validar paymentConditions
    if (data.paymentConditions && Array.isArray(data.paymentConditions)) {
      for (const condition of data.paymentConditions) {
        if (!condition.type || !['por_temporada', 'por_etapa'].includes(condition.type)) {
          throw new BadRequestException('Tipo de condição de pagamento inválido');
        }

        if (typeof condition.value !== 'number' || condition.value <= 0) {
          throw new BadRequestException('Valor da condição de pagamento deve ser um número positivo');
        }

        if (condition.paymentMethods && Array.isArray(condition.paymentMethods)) {
          for (const method of condition.paymentMethods) {
            if (!Object.values(PaymentMethod).includes(method)) {
              throw new BadRequestException(`Método de pagamento inválido: ${method}`);
            }
          }
        }

        if (condition.pixInstallments !== undefined && (typeof condition.pixInstallments !== 'number' || condition.pixInstallments < 1 || condition.pixInstallments > 12)) {
          throw new BadRequestException('Parcelamento PIX deve ser entre 1 e 12');
        }

        if (condition.creditCardInstallments !== undefined && (typeof condition.creditCardInstallments !== 'number' || condition.creditCardInstallments < 1 || condition.creditCardInstallments > 12)) {
          throw new BadRequestException('Parcelamento cartão de crédito deve ser entre 1 e 12');
        }
      }
    }
  }
} 