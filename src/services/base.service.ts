import { DeepPartial } from 'typeorm';

import { BaseRepository } from '../repositories/base.repository';

export abstract class BaseService<T> {
  constructor(protected repository: BaseRepository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  async create(item: DeepPartial<T>): Promise<T> {
    return this.repository.create(item);
  }

  async update(id: string, item: DeepPartial<T>): Promise<T | null> {
    return this.repository.update(id, item);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
