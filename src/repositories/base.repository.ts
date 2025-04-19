import { DeepPartial } from 'typeorm';

export interface BaseRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(item: DeepPartial<T>): Promise<T>;
  update(id: string, item: DeepPartial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
} 