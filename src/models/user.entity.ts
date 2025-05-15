import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum UserRole {
  MEMBER = 'Member',
  ADMINISTRATOR = 'Administrator',
  MANAGER = 'Manager'
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
  
  @Column({ type: 'varchar', length: 100, nullable: true })
  resetPasswordToken?: string;
  
  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;
} 