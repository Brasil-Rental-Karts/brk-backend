import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pilot } from './pilot.entity';
import { Organizer } from './organizer.entity';
import { Administrator } from './administrator.entity';

export enum UserRole {
  MEMBER = 'Member',
  PILOT = 'Pilot',
  ORGANIZER = 'Organizer',
  ADMINISTRATOR = 'Administrator'
}

@Entity('Users')
export class User extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string = '';

  @Column({ length: 100, nullable: false, unique: true })
  email: string = '';

  @Column({ length: 20, nullable: true })
  phone: string = '';

  @Column({ length: 100, nullable: false })
  password: string = '';

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    default: UserRole.MEMBER 
  })
  role: UserRole = UserRole.MEMBER;

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