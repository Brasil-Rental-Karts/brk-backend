import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { KartingTrack } from '../models/karting-track.entity';
import { KartingTrackRepository } from '../repositories/karting-track.repository';

export class KartingTrackService extends BaseService<KartingTrack> {
  constructor(private kartingTrackRepository: KartingTrackRepository) {
    super(kartingTrackRepository);
  }

  async findAll(): Promise<KartingTrack[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<KartingTrack | null> {
    return super.findById(id);
  }

  async create(kartingTrackData: DeepPartial<KartingTrack>): Promise<KartingTrack> {
    return super.create(kartingTrackData);
  }

  async update(id: string, kartingTrackData: DeepPartial<KartingTrack>): Promise<KartingTrack | null> {
    return super.update(id, kartingTrackData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}