import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Season } from './season.entity';

@Entity('Regulations')
export class Regulation extends BaseEntity {
  @Column({ length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'int', nullable: false })
  order: number;

  // Relacionamento com a temporada
  @Column({ nullable: false })
  seasonId: string;

  @ManyToOne(() => Season, (season) => season.regulations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seasonId' })
  season: Season;
} 