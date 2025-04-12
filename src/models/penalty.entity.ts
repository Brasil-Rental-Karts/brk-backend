import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Result } from './result.entity';
import { Appeal } from './appeal.entity';

@Entity('Penalties')
export class Penalty extends BaseEntity {
  @ManyToOne(() => Result, result => result.penalties)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @Column({ length: 50, nullable: true })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  pointsDeducted: number;

  @Column({ type: 'interval', nullable: true })
  timePenalty: string;

  @Column({ length: 100, nullable: true })
  issuedBy: string;

  // Relations
  @OneToOne(() => Appeal, appeal => appeal.penalty)
  appeal: Appeal;
} 