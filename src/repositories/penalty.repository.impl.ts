import { Repository } from 'typeorm';

import { Penalty, PenaltyStatus, PenaltyType } from '../models/penalty.entity';
import { BaseRepositoryImpl } from './base.repository.impl';
import { IPenaltyRepository } from './penalty.repository';

export class PenaltyRepositoryImpl
  extends BaseRepositoryImpl<Penalty>
  implements IPenaltyRepository
{
  constructor(repository: Repository<Penalty>) {
    super(repository);
  }

  async create(item: Partial<Penalty>): Promise<Penalty> {
    const newItem = this.repository.create(item);
    const savedItem = await this.repository.save(newItem);

    // Retornar o item com todas as relações carregadas
    const penaltyWithRelations = await this.findById(savedItem.id);
    return penaltyWithRelations || savedItem;
  }

  async findById(id: string): Promise<Penalty | null> {
    return this.repository.findOne({
      where: { id },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
    });
  }

  async findByUserId(userId: string): Promise<Penalty[]> {
    return this.repository.find({
      where: { userId },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByChampionshipId(championshipId: string): Promise<Penalty[]> {
    return this.repository.find({
      where: { championshipId },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeasonId(seasonId: string): Promise<Penalty[]> {
    return this.repository.find({
      where: { seasonId },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStageId(stageId: string): Promise<Penalty[]> {
    return this.repository.find({
      where: { stageId },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<Penalty[]> {
    return this.repository.find({
      where: { categoryId },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findActivePenalties(
    userId: string,
    championshipId: string
  ): Promise<Penalty[]> {
    return this.repository.find({
      where: {
        userId,
        championshipId,
        status: PenaltyStatus.APPLIED,
      },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingPenalties(): Promise<Penalty[]> {
    return this.repository.find({
      where: { status: PenaltyStatus.NOT_APPLIED },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByType(type: PenaltyType): Promise<Penalty[]> {
    return this.repository.find({
      where: { type },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: PenaltyStatus): Promise<Penalty[]> {
    return this.repository.find({
      where: { status },
      relations: [
        'user',
        'championship',
        'season',
        'stage',
        'category',
        'appliedByUser',
        'appealedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
