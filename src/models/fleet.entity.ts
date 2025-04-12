import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';

@Entity('Fleet')
export class Fleet extends BaseEntity {
  @ManyToOne(() => Venue, venue => venue.fleets)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @Column({ length: 50, nullable: true })
  kartModel: string;

  @Column({ nullable: true })
  quantity: number;

  @Column({ length: 50, nullable: true })
  engineType: string;

  @Column({ type: 'date', nullable: true })
  maintenanceDate: Date;
} 