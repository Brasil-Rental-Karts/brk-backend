import { Repository } from 'typeorm';

import { RaceTrack } from '../models/race-track.entity';
import { BaseRepository } from './base.repository';

export interface IRaceTrackRepository extends BaseRepository<RaceTrack> {
  findActive(): Promise<RaceTrack[]>;
  findByName(name: string): Promise<RaceTrack | null>;
  findByCity(city: string): Promise<RaceTrack[]>;
  findByState(state: string): Promise<RaceTrack[]>;
}

export class RaceTrackRepository implements IRaceTrackRepository {
  constructor(private readonly repository: Repository<RaceTrack>) {}

  async create(data: Partial<RaceTrack>): Promise<RaceTrack> {
    const raceTrack = this.repository.create(data);
    return await this.repository.save(raceTrack);
  }

  async findById(id: string): Promise<RaceTrack | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<RaceTrack[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.repository.findByIds(ids);
  }

  async findAll(): Promise<RaceTrack[]> {
    return await this.repository.find({
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<RaceTrack[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findByName(name: string): Promise<RaceTrack | null> {
    return await this.repository.findOne({
      where: { name },
    });
  }

  async findByCity(city: string): Promise<RaceTrack[]> {
    return await this.repository.find({
      where: { city },
      order: { name: 'ASC' },
    });
  }

  async findByState(state: string): Promise<RaceTrack[]> {
    return await this.repository.find({
      where: { state },
      order: { name: 'ASC' },
    });
  }

  async update(
    id: string,
    data: Partial<RaceTrack>
  ): Promise<RaceTrack | null> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
