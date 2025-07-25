import { Repository } from 'typeorm';

import { ChampionshipStaff } from '../models/championship-staff.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class ChampionshipStaffRepository extends BaseRepositoryImpl<ChampionshipStaff> {
  constructor(repository: Repository<ChampionshipStaff>) {
    super(repository);
  }

  async findByChampionshipId(
    championshipId: string
  ): Promise<ChampionshipStaff[]> {
    return this.repository.find({
      where: {
        championshipId,
        isActive: true,
      },
      relations: ['user', 'addedBy'],
      order: { addedAt: 'DESC' },
    });
  }

  async findByUserAndChampionship(
    userId: string,
    championshipId: string
  ): Promise<ChampionshipStaff | null> {
    return this.repository.findOne({
      where: {
        userId,
        championshipId,
        isActive: true,
      },
      relations: ['user', 'championship', 'addedBy'],
    });
  }

  async isUserStaffMember(
    userId: string,
    championshipId: string
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        championshipId,
        isActive: true,
      },
    });
    return count > 0;
  }

  async getUserStaffChampionships(
    userId: string
  ): Promise<ChampionshipStaff[]> {
    return this.repository.find({
      where: {
        userId,
        isActive: true,
      },
      relations: ['championship'],
      order: { addedAt: 'DESC' },
    });
  }

  async removeFromStaff(userId: string, championshipId: string): Promise<void> {
    await this.repository.update(
      { userId, championshipId },
      {
        isActive: false,
        removedAt: new Date(),
      }
    );
  }

  async findByIdWithRelations(id: string): Promise<ChampionshipStaff | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'addedBy', 'championship'],
    });
  }

  async createStaffMember(
    staffData: Partial<ChampionshipStaff>
  ): Promise<ChampionshipStaff> {
    // Use raw SQL to insert the staff member to bypass TypeORM mapping issues
    const result = await this.repository.query(
      `
      INSERT INTO "ChampionshipStaff" 
      ("championshipId", "userId", "role", "isActive", "addedById", "addedAt", "permissions")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "id"
    `,
      [
        staffData.championshipId,
        staffData.userId,
        staffData.role || 'staff',
        staffData.isActive !== false,
        staffData.addedById,
        staffData.addedAt || new Date(),
        JSON.stringify(staffData.permissions || {}),
      ]
    );

    const insertedId = result[0].id;
    const createdStaffMember = await this.findByIdWithRelations(insertedId);

    if (!createdStaffMember) {
      throw new Error('Failed to create staff member');
    }

    return createdStaffMember;
  }
}
