import { Column, Entity, OneToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { MemberProfile } from './member-profile.entity';

export enum UserRole {
  MEMBER = 'Member',
  ADMINISTRATOR = 'Administrator',
  MANAGER = 'Manager',
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
    default: UserRole.MEMBER,
  })
  role: UserRole = UserRole.MEMBER;

  @Column({ type: 'date', nullable: false })
  registrationDate: Date = new Date();

  @Column({ default: true })
  active: boolean = true;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  googleId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profilePicture?: string;

  @Column({ default: false })
  emailConfirmed: boolean = false;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emailConfirmationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailConfirmationExpires?: Date;

  // Relations
  @OneToOne(() => MemberProfile, memberProfile => memberProfile.user)
  memberProfile?: MemberProfile;
}
