import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Heat } from './heat.entity';
import { Pilot } from './pilot.entity';
import { Penalty } from './penalty.entity';

@Entity('Results')
export class Result extends BaseEntity {
  @ManyToOne(() => Heat, heat => heat.results)
  @JoinColumn({ name: 'heat_id' })
  heat: Heat;

  @ManyToOne(() => Pilot, pilot => pilot.results)
  @JoinColumn({ name: 'pilot_id' })
  pilot: Pilot;

  @Column({ nullable: true })
  position: number;

  @Column({ type: 'interval', nullable: true })
  lapTime: string;

  @Column({ type: 'interval', nullable: true })
  bestLap: string;

  @Column({ nullable: true })
  points: number;

  @Column({ default: false })
  disqualified: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @OneToMany(() => Penalty, penalty => penalty.result)
  penalties: Penalty[];
} 