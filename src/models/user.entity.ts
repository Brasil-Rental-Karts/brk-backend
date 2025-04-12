import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pilot } from './pilot.entity';
import { Organizer } from './organizer.entity';
import { Administrator } from './administrator.entity';

@Entity('Users')
export class User extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string = '';

  @Column({ length: 100, nullable: false, unique: true })
  email: string = '';

  @Column({ length: 20, nullable: true })
  phone: string = '';

  @Column({ type: 'date', nullable: false })
  registrationDate: Date = new Date();

  @Column({ default: true })
  active: boolean = true;

  // Relations
  @OneToOne(() => Pilot, pilot => pilot.user)
  pilot?: Pilot;

  @OneToOne(() => Organizer, organizer => organizer.user)
  organizer?: Organizer;

  @OneToOne(() => Administrator, administrator => administrator.user)
  administrator?: Administrator;
} 