import { Repository } from 'typeorm';
import { BaseRepositoryImpl } from './base.repository.impl';
import { Regulation } from '../models/regulation.entity';

export interface RegulationRepository extends BaseRepositoryImpl<Regulation> {
  findBySeasonId(seasonId: string): Promise<Regulation[]>;
  findBySeasonIdOrdered(seasonId: string): Promise<Regulation[]>;
  updateOrder(id: string, newOrder: number): Promise<void>;
  reorderRegulations(seasonId: string, regulationOrders: { id: string; order: number }[]): Promise<void>;
  getNextOrder(seasonId: string): Promise<number>;
}

export class RegulationRepositoryImpl extends BaseRepositoryImpl<Regulation> implements RegulationRepository {
  constructor(private regulationRepository: Repository<Regulation>) {
    super(regulationRepository);
  }

  async findBySeasonId(seasonId: string): Promise<Regulation[]> {
    return this.regulationRepository.find({
      where: { seasonId, isActive: true },
      order: { order: 'ASC' }
    });
  }

  async findBySeasonIdOrdered(seasonId: string): Promise<Regulation[]> {
    return this.regulationRepository.find({
      where: { seasonId },
      order: { order: 'ASC' }
    });
  }

  async updateOrder(id: string, newOrder: number): Promise<void> {
    await this.regulationRepository.update(id, { order: newOrder });
  }

  async reorderRegulations(seasonId: string, regulationOrders: { id: string; order: number }[]): Promise<void> {
    // Use a transaction to ensure all updates are atomic
    await this.regulationRepository.manager.transaction(async (transactionalEntityManager) => {
      for (const { id, order } of regulationOrders) {
        await transactionalEntityManager.update(Regulation, id, { order });
      }
    });
  }

  async getNextOrder(seasonId: string): Promise<number> {
    const result = await this.regulationRepository
      .createQueryBuilder('regulation')
      .select('MAX(regulation.order)', 'maxOrder')
      .where('regulation.seasonId = :seasonId', { seasonId })
      .getRawOne();

    return (result?.maxOrder || 0) + 1;
  }
} 