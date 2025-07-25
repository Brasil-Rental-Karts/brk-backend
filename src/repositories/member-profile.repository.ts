import { Repository } from 'typeorm';

import { MemberProfile } from '../models/member-profile.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class MemberProfileRepository extends BaseRepositoryImpl<MemberProfile> {
  constructor(repository: Repository<MemberProfile>) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<MemberProfile | null> {
    return this.repository.findOne({ where: { id: userId } });
  }

  async updateLastLogin(userId: string): Promise<MemberProfile | null> {
    const profile = await this.findByUserId(userId);

    if (profile) {
      profile.lastLoginAt = new Date();
      return this.repository.save(profile);
    }

    return null;
  }
}
