import { Entity, Column, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     MemberProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier (same as User ID)
 *         nickname:
 *           type: string
 *           description: User's nickname/display name
 *         birthday:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last login
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the profile was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the profile was last updated
 */
@Entity('MemberProfiles')
export class MemberProfile extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id' })
  user!: User;

  @Column({ length: 50, nullable: true })
  nickname?: string;

  @Column({ type: 'date', nullable: true })
  birthday?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  // Additional profile fields can be added here
} 