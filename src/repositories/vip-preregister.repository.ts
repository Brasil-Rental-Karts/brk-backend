import { Repository } from 'typeorm';

import { VipPreregister } from '../models/vip-preregister.entity';
import { BaseRepository } from './base.repository';
import { BaseRepositoryImpl } from './base.repository.impl';

export class VipPreregisterRepository
  extends BaseRepositoryImpl<VipPreregister>
  implements BaseRepository<VipPreregister>
{
  constructor(repository: Repository<VipPreregister>) {
    super(repository);
  }

  async findByEmail(email: string): Promise<VipPreregister | null> {
    return this.repository.findOne({ where: { email } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }
}
