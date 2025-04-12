import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { Venue } from './venue.entity';
import { Heat } from './heat.entity';

@Entity('Stages')
export class Stage extends BaseEntity {
  @Column({ length: 100, nullable: true })
  name: string;

  @ManyToOne(() => Category, category => category.stages)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Venue, venue => venue.stages)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ type: 'time', nullable: true })
  startTime: Date;

  @Column({ length: 20, nullable: true })
  status: string;

  // Relations
  @OneToMany(() => Heat, heat => heat.stage)
  heats: Heat[];
} 