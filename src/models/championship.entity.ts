import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Club } from './club.entity';
import { Season } from './season.entity';

@Entity('Championship')
export class Championship extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @ManyToOne(() => Club, club => club.championships)
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  rules: string;

  // Relations
  @OneToMany(() => Season, season => season.championship)
  seasons: Season[];
} 