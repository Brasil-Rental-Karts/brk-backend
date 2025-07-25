import { Column, Entity } from 'typeorm';

import { DefaultFleets, TrackLayouts } from '../types/race-track.types';
import { BaseEntity } from './base.entity';

@Entity('RaceTracks')
export class RaceTrack extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ length: 100, nullable: false })
  city: string;

  @Column({ length: 2, nullable: false })
  state: string;

  @Column({ type: 'text', nullable: false })
  address: string;

  @Column({ type: 'jsonb', nullable: false })
  trackLayouts: TrackLayouts;

  @Column({ type: 'jsonb', nullable: false })
  defaultFleets: DefaultFleets;

  @Column({ type: 'text', nullable: true })
  generalInfo?: string;

  @Column({ default: true })
  isActive: boolean;
}
