import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Season } from './season.entity';
import { RegulationSection } from './regulation-section.entity';

export enum RegulationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

@Entity('Regulations')
export class Regulation extends BaseEntity {
  @Column({ 
    type: 'enum', 
    enum: RegulationStatus, 
    default: RegulationStatus.DRAFT,
    nullable: false
  })
  status: RegulationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  // Relacionamento com a temporada
  @Column({ nullable: false })
  seasonId: string;

  @ManyToOne(() => Season, (season) => season.regulations)
  @JoinColumn({ name: 'seasonId' })
  season: Season;

  @OneToMany(() => RegulationSection, (section) => section.regulation, { cascade: true })
  sections: RegulationSection[];
} 