import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

import { BaseEntity } from '../models/base.entity';
import { BaseRepository } from './base.repository';

export class BaseRepositoryImpl<T extends BaseEntity>
  implements BaseRepository<T>
{
  constructor(protected repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOneBy({ id } as FindOptionsWhere<T>);
  }

  async findByIds(ids: string[]): Promise<T[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.repository.findByIds(ids);
  }

  async create(item: DeepPartial<T>): Promise<T> {
    const newItem = this.repository.create(item);
    return this.repository.save(newItem);
  }

  async update(id: string, item: DeepPartial<T>): Promise<T | null> {
    const existingItem = await this.findById(id);

    if (!existingItem) {
      return null;
    }

    const updatedItem = this.repository.merge(existingItem, item);
    return this.repository.save(updatedItem);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return !!result.affected && result.affected > 0;
  }
}
