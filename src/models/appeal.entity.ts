import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Penalty } from './penalty.entity';
import { Pilot } from './pilot.entity';

@Entity('Appeals')
export class Appeal extends BaseEntity {
  @OneToOne(() => Penalty, penalty => penalty.appeal)
  @JoinColumn({ name: 'penalty_id' })
  penalty: Penalty;

  @ManyToOne(() => Pilot, pilot => pilot.appeals)
  @JoinColumn({ name: 'filed_by' })
  filedBy: Pilot;

  @Column({ type: 'timestamp', nullable: true })
  filingDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'timestamp', nullable: true })
  resolutionDate: Date;
} 