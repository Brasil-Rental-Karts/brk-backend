import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Season } from './season.entity';
import { Championship } from './championship.entity';

@Entity('ChampionshipClassification')
@Unique(['userId', 'categoryId', 'seasonId'])
export class ChampionshipClassification extends BaseEntity {
  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  categoryId: string;

  @Column({ nullable: false })
  seasonId: string;

  @Column({ nullable: false })
  championshipId: string;

  @Column({ type: 'int', default: 0 })
  totalPoints: number;

  @Column({ type: 'int', default: 0 })
  totalStages: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  podiums: number;

  @Column({ type: 'int', default: 0 })
  polePositions: number;

  @Column({ type: 'int', default: 0 })
  fastestLaps: number;

  @Column({ type: 'int', nullable: true })
  bestPosition: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averagePosition: number | null;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToOne(() => Season, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seasonId' })
  season: Season;

  @ManyToOne(() => Championship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;
} 