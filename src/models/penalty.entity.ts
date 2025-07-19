import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Championship } from './championship.entity';
import { Season } from './season.entity';
import { Stage } from './stage.entity';
import { Category } from './category.entity';

export enum PenaltyType {
  DISQUALIFICATION = 'disqualification',
  TIME_PENALTY = 'time_penalty',
  POSITION_PENALTY = 'position_penalty',
  WARNING = 'warning'
}

export enum PenaltyStatus {
  APPLIED = 'applied',
  NOT_APPLIED = 'not_applied',
  APPEALED = 'appealed'
}

@Entity('penalties')
export class Penalty extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PenaltyType })
  type: PenaltyType;

  @Column({ type: 'enum', enum: PenaltyStatus, default: PenaltyStatus.APPLIED })
  status: PenaltyStatus;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', nullable: true })
  timePenaltySeconds: number;

  @Column({ type: 'int', nullable: true })
  positionPenalty: number;

  @Column({ type: 'int', nullable: true })
  batteryIndex: number;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  championshipId: string;

  @ManyToOne(() => Championship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;

  @Column({ type: 'uuid', nullable: true })
  seasonId: string;

  @ManyToOne(() => Season, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seasonId' })
  season: Season;

  @Column({ type: 'uuid', nullable: true })
  stageId: string;

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid' })
  appliedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliedByUserId' })
  appliedByUser: User;

  @Column({ type: 'text', nullable: true })
  appealReason: string;

  @Column({ type: 'uuid', nullable: true })
  appealedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appealedByUserId' })
  appealedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 