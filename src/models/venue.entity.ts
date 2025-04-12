import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { KartingTrack } from './karting-track.entity';
import { Stage } from './stage.entity';
import { Fleet } from './fleet.entity';

@Entity('Venues')
export class Venue extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string = '';

  @ManyToOne(() => KartingTrack, track => track.venues)
  @JoinColumn({ name: 'track_id' })
  track!: KartingTrack;

  @Column({ type: 'text', nullable: true })
  address: string = '';

  @Column({ nullable: true })
  capacity: number = 0;

  @Column({ type: 'text', nullable: true })
  facilities: string = '';

  // Relations
  @OneToMany(() => Stage, stage => stage.venue)
  stages: Stage[];

  @OneToMany(() => Fleet, fleet => fleet.venue)
  fleets: Fleet[];
} 