import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('Stages')
export class Stage extends BaseEntity {
  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ type: 'date', nullable: false })
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

  @Column({ nullable: true })
  defaultGridTypeId: string;

  @Column({ nullable: true })
  defaultScoringSystemId: string;

  @Column({ type: 'boolean', nullable: false, default: false })
  doublePoints: boolean;

  @Column({ type: 'text', nullable: true })
  briefing: string;

  @Column({ type: 'time', nullable: true })
  briefingTime: string;
} 