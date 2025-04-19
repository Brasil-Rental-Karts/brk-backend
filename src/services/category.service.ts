import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository } from '../repositories/category.repository';

export class CategoryService extends BaseService<Category> {
  constructor(private categoryRepository: CategoryRepository) {
    super(categoryRepository);
  }

  async findAll(): Promise<Category[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Category | null> {
    return super.findById(id);
  }

  async create(categoryData: DeepPartial<Category>): Promise<Category> {
    return super.create(categoryData);
  }

  async update(id: string, categoryData: DeepPartial<Category>): Promise<Category | null> {
    return super.update(id, categoryData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}