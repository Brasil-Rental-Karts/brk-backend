import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class UserRepository extends BaseRepositoryImpl<User> {
  constructor(repository: Repository<User>) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
} 