import { CreditCardFeesRepository, CreditCardFeesRepositoryImpl } from '../repositories/credit-card-fees.repository';
import { CreditCardFees } from '../models/credit-card-fees.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

export interface CreateCreditCardFeesData {
  championshipId: string;
  installmentRange: string;
  percentageRate: number;
  fixedFee: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCreditCardFeesData {
  installmentRange?: string;
  percentageRate?: number;
  fixedFee?: number;
  description?: string;
  isActive?: boolean;
}

export class CreditCardFeesService {
  private repository: CreditCardFeesRepository;

  constructor() {
    this.repository = new CreditCardFeesRepositoryImpl();
  }

  async findAll(): Promise<CreditCardFees[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<CreditCardFees | null> {
    return this.repository.findById(id);
  }

  async findByChampionshipId(championshipId: string): Promise<CreditCardFees[]> {
    return this.repository.findByChampionshipId(championshipId);
  }

  async create(data: CreateCreditCardFeesData): Promise<CreditCardFees> {
    // Validar dados
    this.validateInstallmentRange(data.installmentRange);
    this.validatePercentageRate(data.percentageRate);
    this.validateFixedFee(data.fixedFee);

    // Verificar se já existe uma configuração para este range no campeonato
    const existingFees = await this.repository.findByChampionshipId(data.championshipId);
    const hasConflict = existingFees.some(fee => 
      fee.installmentRange === data.installmentRange && fee.id !== data.championshipId
    );

    if (hasConflict) {
      throw new BadRequestException(`Já existe uma configuração para o range de parcelas '${data.installmentRange}' neste campeonato`);
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateCreditCardFeesData): Promise<CreditCardFees | null> {
    const existingFee = await this.repository.findById(id);
    if (!existingFee) {
      throw new NotFoundException('Configuração de taxa não encontrada');
    }

    // Validar dados se fornecidos
    if (data.installmentRange) {
      this.validateInstallmentRange(data.installmentRange);
    }
    if (data.percentageRate !== undefined) {
      this.validatePercentageRate(data.percentageRate);
    }
    if (data.fixedFee !== undefined) {
      this.validateFixedFee(data.fixedFee);
    }

    // Verificar conflitos se o range foi alterado
    if (data.installmentRange && data.installmentRange !== existingFee.installmentRange) {
      const existingFees = await this.repository.findByChampionshipId(existingFee.championshipId);
      const hasConflict = existingFees.some(fee => 
        fee.installmentRange === data.installmentRange && fee.id !== id
      );

      if (hasConflict) {
        throw new BadRequestException(`Já existe uma configuração para o range de parcelas '${data.installmentRange}' neste campeonato`);
      }
    }

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const existingFee = await this.repository.findById(id);
    if (!existingFee) {
      throw new NotFoundException('Configuração de taxa não encontrada');
    }

    return this.repository.delete(id);
  }

  async getRateForInstallments(championshipId: string, installments: number): Promise<{ percentageRate: number; fixedFee: number } | null> {
    return this.repository.getRateForInstallments(championshipId, installments);
  }

  async getDefaultRateForInstallments(installments: number): Promise<{ percentageRate: number; fixedFee: number }> {
    // Taxas padrão hardcoded como fallback
    const defaultRates: Record<number, { percentageRate: number; fixedFee: number }> = {
      1: { percentageRate: 1.99, fixedFee: 0.49 },
      2: { percentageRate: 2.49, fixedFee: 0.49 },
      3: { percentageRate: 2.49, fixedFee: 0.49 },
      4: { percentageRate: 2.49, fixedFee: 0.49 },
      5: { percentageRate: 2.49, fixedFee: 0.49 },
      6: { percentageRate: 2.49, fixedFee: 0.49 },
      7: { percentageRate: 2.99, fixedFee: 0.49 },
      8: { percentageRate: 2.99, fixedFee: 0.49 },
      9: { percentageRate: 2.99, fixedFee: 0.49 },
      10: { percentageRate: 2.99, fixedFee: 0.49 },
      11: { percentageRate: 2.99, fixedFee: 0.49 },
      12: { percentageRate: 2.99, fixedFee: 0.49 },
    };

    // Para parcelas acima de 12, usar 3.29%
    if (installments > 12) {
      return { percentageRate: 3.29, fixedFee: 0.49 };
    }

    return defaultRates[installments] || { percentageRate: 3.29, fixedFee: 0.49 };
  }

  private validateInstallmentRange(range: string): void {
    if (!range || range.trim() === '') {
      throw new BadRequestException('Range de parcelas é obrigatório');
    }

    // Validar formato: '1' ou '2-6' ou '7-12' etc.
    const rangePattern = /^(\d+)(-\d+)?$/;
    if (!rangePattern.test(range)) {
      throw new BadRequestException('Range de parcelas deve estar no formato "1" ou "2-6"');
    }

    if (range.includes('-')) {
      const [min, max] = range.split('-').map(Number);
      if (min >= max) {
        throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo no range de parcelas');
      }
    }
  }

  private validatePercentageRate(rate: number): void {
    if (rate < 0 || rate > 100) {
      throw new BadRequestException('Taxa percentual deve estar entre 0 e 100');
    }
  }

  private validateFixedFee(fee: number): void {
    if (fee < 0) {
      throw new BadRequestException('Taxa fixa não pode ser negativa');
    }
  }
} 