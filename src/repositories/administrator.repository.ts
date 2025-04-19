import { Repository } from 'typeorm';
import { Administrator } from '../models/administrator.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class AdministratorRepository extends BaseRepositoryImpl<Administrator> {
  constructor(repository: Repository<Administrator>) {
    super(repository);
  }
}