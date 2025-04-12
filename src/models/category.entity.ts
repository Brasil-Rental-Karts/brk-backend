import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pilot } from './pilot.entity';
import { Season } from './season.entity';
import { Stage } from './stage.entity';

@Entity('Categories')
export class Category extends BaseEntity {
  @Column({ length: 50, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  minAge: number;

  @Column({ nullable: true })
  maxAge: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  weightLimit: number;

  // Relations
  @ManyToMany(() => Pilot, pilot => pilot.categories)
  pilots: Pilot[];

  @ManyToMany(() => Season, season => season.categories)
  seasons: Season[];

  @OneToMany(() => Stage, stage => stage.category)
  stages: Stage[];
} 