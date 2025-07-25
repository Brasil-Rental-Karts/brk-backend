import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { Stage } from './stage.entity';
import { User } from './user.entity';

export enum ParticipationStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('StageParticipations')
@Index(['userId', 'stageId', 'categoryId'], { unique: true })
export class StageParticipation extends BaseEntity {
  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  stageId: string;

  @Column({ nullable: false })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    default: ParticipationStatus.CONFIRMED,
  })
  status: ParticipationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string | null;

  // Relacionamentos
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Stage)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
