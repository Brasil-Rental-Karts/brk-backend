import { Repository } from 'typeorm';
import { Category } from '../models/category.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class CategoryRepository extends BaseRepositoryImpl<Category> {
  constructor(repository: Repository<Category>) {
    super(repository);
  }
}