import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organizer } from './organizer.entity';
import { Championship } from './championship.entity';

@Entity('Clubs')
export class Club extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'date', nullable: true })
  foundationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  logoUrl: string;

  // Relations
  @ManyToMany(() => Organizer, organizer => organizer.clubs)
  organizers: Organizer[];

  @OneToMany(() => Championship, championship => championship.club)
  championships: Championship[];
} 