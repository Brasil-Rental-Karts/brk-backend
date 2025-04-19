import { Repository } from 'typeorm';
import { KartingTrack } from '../models/karting-track.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class KartingTrackRepository extends BaseRepositoryImpl<KartingTrack> {
  constructor(repository: Repository<KartingTrack>) {
    super(repository);
  }
}