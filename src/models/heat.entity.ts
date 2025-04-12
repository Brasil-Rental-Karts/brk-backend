import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Stage } from './stage.entity';
import { Result } from './result.entity';

@Entity('Heats')
export class Heat extends BaseEntity {
  @ManyToOne(() => Stage, stage => stage.heats)
  @JoinColumn({ name: 'stage_id' })
  stage: Stage;

  @Column({ nullable: true })
  number: number;

  @Column({ type: 'time', nullable: true })
  startTime: Date;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  maxParticipants: number;

  @Column({ length: 20, nullable: true })
  status: string;

  // Relations
  @OneToMany(() => Result, result => result.heat)
  results: Result[];
} 