import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database.config';
import { CreditCardFees } from '../models/credit-card-fees.entity';
import { BaseRepository } from './base.repository';

export interface CreditCardFeesRepository
  extends BaseRepository<CreditCardFees> {
  findByChampionshipId(championshipId: string): Promise<CreditCardFees[]>;
  findByChampionshipIdAndActive(
    championshipId: string
  ): Promise<CreditCardFees[]>;
  getRateForInstallments(
    championshipId: string,
    installments: number
  ): Promise<{ percentageRate: number; fixedFee: number } | null>;
}

export class CreditCardFeesRepositoryImpl implements CreditCardFeesRepository {
  private repository: Repository<CreditCardFees>;

  constructor() {
    this.repository = AppDataSource.getRepository(CreditCardFees);
  }

  async findAll(): Promise<CreditCardFees[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<CreditCardFees | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<CreditCardFees[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.repository.findByIds(ids);
  }

  async create(data: Partial<CreditCardFees>): Promise<CreditCardFees> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<CreditCardFees>
  ): Promise<CreditCardFees | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async findByChampionshipId(
    championshipId: string
  ): Promise<CreditCardFees[]> {
    return this.repository.find({
      where: { championshipId },
      order: {
        installmentRange: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async findByChampionshipIdAndActive(
    championshipId: string
  ): Promise<CreditCardFees[]> {
    return this.repository.find({
      where: {
        championshipId,
        isActive: true,
      },
      order: {
        installmentRange: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async getRateForInstallments(
    championshipId: string,
    installments: number
  ): Promise<{ percentageRate: number; fixedFee: number } | null> {
    const fees = await this.findByChampionshipIdAndActive(championshipId);

    for (const fee of fees) {
      if (this.isInstallmentInRange(installments, fee.installmentRange)) {
        return {
          percentageRate: Number(fee.percentageRate),
          fixedFee: Number(fee.fixedFee),
        };
      }
    }

    return null;
  }

  private isInstallmentInRange(installments: number, range: string): boolean {
    if (range === '1') {
      return installments === 1;
    }

    const parts = range.split('-');
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      return installments >= min && installments <= max;
    }

    return false;
  }
}
