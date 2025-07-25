import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BatteriesConfig } from '../types/category.types';
import { BaseEntity } from './base.entity';
import { Season } from './season.entity';

@Entity('Categories')
export class Category extends BaseEntity {
  @Column({ length: 75, nullable: false })
  name: string;

  @Column({ type: 'int', nullable: false })
  ballast: number;

  @Column({ type: 'int', nullable: false })
  maxPilots: number;

  @Column({ type: 'jsonb', nullable: false })
  batteriesConfig: BatteriesConfig;

  @Column({ type: 'int', nullable: false })
  minimumAge: number;

  // Campos de descarte
  @Column({ type: 'boolean', default: false })
  allowDiscarding: boolean;

  @Column({ type: 'enum', enum: ['bateria', 'etapa'], nullable: true })
  discardingType?: 'bateria' | 'etapa';

  @Column({ type: 'int', nullable: true })
  discardingQuantity?: number;

  // Relacionamento com a temporada
  @Column({ nullable: false })
  seasonId: string;

  @ManyToOne(() => Season, season => season.categories)
  @JoinColumn({ name: 'seasonId' })
  season: Season;
}
