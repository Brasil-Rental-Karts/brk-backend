import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('Stages')
export class Stage extends BaseEntity {
  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ type: 'timestamp', nullable: false })
  date: Date;

  @Column({ type: 'time', nullable: false })
  time: string;

  @Column({ length: 255, nullable: false })
  kartodrome: string;

  @Column({ type: 'text', nullable: false })
  kartodromeAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  streamLink: string;

  @Column({ nullable: false })
  seasonId: string;

  @Column({ type: 'simple-array', nullable: false })
  categoryIds: string[];

  @Column({ type: 'boolean', nullable: false, default: false })
  doublePoints: boolean;

  @Column({ type: 'text', nullable: true })
  briefing: string;

  @Column({ type: 'time', nullable: true })
  briefingTime: string;

  @Column({ type: 'jsonb', nullable: true })
  schedule: any;

  @Column({ type: 'jsonb', nullable: true })
  fleets: any;

  @Column({ type: 'jsonb', nullable: true })
  kart_draw_assignments: any;

  @Column({ type: 'jsonb', nullable: true })
  stage_results: any;
} 