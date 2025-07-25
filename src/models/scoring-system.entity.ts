import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';

export interface ScoringPosition {
  position: number;
  points: number;
}

@Entity('ScoringSystem')
export class ScoringSystem extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'jsonb', nullable: false })
  positions: ScoringPosition[];

  @Column({ type: 'int', default: 0 })
  polePositionPoints: number;

  @Column({ type: 'int', default: 0 })
  fastestLapPoints: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  // Relacionamento com Championship
  @Column({ nullable: false })
  championshipId: string;

  @ManyToOne(() => Championship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;
}
