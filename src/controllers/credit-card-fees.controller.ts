import { Request, Response } from 'express';

import {
  CreateCreditCardFeesDto,
  UpdateCreditCardFeesDto,
} from '../dtos/credit-card-fees.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { UserRole } from '../models/user.entity';
import {
  CreateCreditCardFeesData,
  CreditCardFeesService,
  UpdateCreditCardFeesData,
} from '../services/credit-card-fees.service';
import { BaseController } from './base.controller';

export class CreditCardFeesController extends BaseController {
  private service: CreditCardFeesService;

  constructor() {
    super('/credit-card-fees');
    this.service = new CreditCardFeesService();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    // Rotas públicas para consulta de taxas
    this.router.get(
      '/championship/:championshipId',
      this.findByChampionshipId.bind(this)
    );
    this.router.get(
      '/championship/:championshipId/installments/:installments',
      this.getRateForInstallments.bind(this)
    );

    // Rotas protegidas para administração
    this.router.get(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.findAll.bind(this)
    );
    this.router.get(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.findById.bind(this)
    );
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      validationMiddleware(CreateCreditCardFeesDto),
      this.create.bind(this)
    );
    this.router.put(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      validationMiddleware(UpdateCreditCardFeesDto),
      this.update.bind(this)
    );
    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.delete.bind(this)
    );
  }

  private async findAll(req: Request, res: Response): Promise<void> {
    try {
      const fees = await this.service.findAll();
      res.status(200).json(fees);
    } catch (error) {
      console.error('Erro ao buscar taxas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const fee = await this.service.findById(id);

      if (!fee) {
        res
          .status(404)
          .json({ message: 'Configuração de taxa não encontrada' });
        return;
      }

      res.status(200).json(fee);
    } catch (error) {
      console.error('Erro ao buscar taxa por ID:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async findByChampionshipId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { championshipId } = req.params;
      const fees = await this.service.findByChampionshipId(championshipId);
      res.status(200).json(fees);
    } catch (error) {
      console.error('Erro ao buscar taxas por campeonato:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCreditCardFeesData = req.body;

      // Validar dados obrigatórios
      if (!data.championshipId) {
        res.status(400).json({ message: 'ID do campeonato é obrigatório' });
        return;
      }
      if (!data.installmentRange) {
        res.status(400).json({ message: 'Range de parcelas é obrigatório' });
        return;
      }
      if (data.percentageRate === undefined || data.percentageRate === null) {
        res.status(400).json({ message: 'Taxa percentual é obrigatória' });
        return;
      }
      if (data.fixedFee === undefined || data.fixedFee === null) {
        res.status(400).json({ message: 'Taxa fixa é obrigatória' });
        return;
      }

      const fee = await this.service.create(data);
      res.status(201).json(fee);
    } catch (error) {
      console.error('Erro ao criar taxa:', error);
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateCreditCardFeesData = req.body;

      const fee = await this.service.update(id, data);

      if (!fee) {
        res
          .status(404)
          .json({ message: 'Configuração de taxa não encontrada' });
        return;
      }

      res.status(200).json(fee);
    } catch (error) {
      console.error('Erro ao atualizar taxa:', error);
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.service.delete(id);

      if (!deleted) {
        res
          .status(404)
          .json({ message: 'Configuração de taxa não encontrada' });
        return;
      }

      res
        .status(200)
        .json({ message: 'Configuração de taxa removida com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar taxa:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getRateForInstallments(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { championshipId, installments } = req.params;
      const installmentsNumber = parseInt(installments, 10);

      if (isNaN(installmentsNumber) || installmentsNumber < 1) {
        res.status(400).json({
          message: 'Número de parcelas deve ser um número válido maior que 0',
        });
        return;
      }

      const rate = await this.service.getRateForInstallments(
        championshipId,
        installmentsNumber
      );

      if (!rate) {
        // Se não encontrar configuração específica, usar taxas padrão
        const defaultRate =
          await this.service.getDefaultRateForInstallments(installmentsNumber);
        res.status(200).json({ ...defaultRate, isDefault: true });
        return;
      }

      res.status(200).json({ ...rate, isDefault: false });
    } catch (error) {
      console.error('Erro ao buscar taxa para parcelas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}
