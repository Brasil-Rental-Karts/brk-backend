import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Administrator } from './administrator.entity';
import { Venue } from './venue.entity';

@Entity('Karting_Tracks')
export class KartingTrack extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  contactInfo: string;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  trackLength: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relations
  @ManyToMany(() => Administrator, administrator => administrator.tracks)
  administrators: Administrator[];

  @OneToMany(() => Venue, venue => venue.track)
  venues: Venue[];
} 