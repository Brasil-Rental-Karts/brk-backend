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
 *           example: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last login
 *           example: "2023-07-25T14:30:00Z"
 *         nickName:
 *           type: string
 *           description: User's nickname
 *           example: "SpeedRacer"
 *         birthDate:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *           example: "1990-05-15"
 *         gender:
 *           type: string
 *           description: User's gender
 *           example: "Male"
 *         city:
 *           type: string
 *           description: User's city
 *           example: "São Paulo"
 *         state:
 *           type: string
 *           description: User's state (2-letter code)
 *           example: "SP"
 *         experienceTime:
 *           type: string
 *           description: User's experience time
 *           example: "3-5 years"
 *         raceFrequency:
 *           type: string
 *           description: User's race frequency
 *           example: "Weekly"
 *         championshipParticipation:
 *           type: string
 *           description: User's championship participation
 *           example: "Regional"
 *         competitiveLevel:
 *           type: string
 *           description: User's competitive level
 *           example: "Intermediate"
 *         hasOwnKart:
 *           type: boolean
 *           description: Whether the user has their own kart
 *           example: true
 *         isTeamMember:
 *           type: boolean
 *           description: Whether the user is a team member
 *           example: false
 *         teamName:
 *           type: string
 *           description: User's team name
 *           example: "Racing Team"
 *         usesTelemetry:
 *           type: boolean
 *           description: Whether the user uses telemetry
 *           example: true
 *         telemetryType:
 *           type: string
 *           description: User's telemetry type
 *           example: "AiM"
 *         attendsEvents:
 *           type: string
 *           description: User's event attendance
 *           example: "Often"
 *         interestCategories:
 *           type: array
 *           items:
 *             type: string
 *           description: User's categories of interest
 *           example: ["Sprint", "Endurance"]
 *         preferredTrack:
 *           type: string
 *           description: User's preferred track
 *           example: "Interlagos"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the profile was created
 *           example: "2023-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the profile was last updated
 *           example: "2023-07-25T14:45:00Z"
 *       example:
 *         id: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
 *         createdAt: "2023-01-15T10:30:00Z"
 *         updatedAt: "2023-07-25T14:45:00Z"
 *         lastLoginAt: "2023-07-25T14:30:00Z"
 *         nickName: "SpeedRacer"
 *         birthDate: "1990-05-15"
 *         gender: "Male"
 *         city: "São Paulo"
 *         state: "SP"
 *         experienceTime: "3-5 years"
 *         raceFrequency: "Weekly"
 *         championshipParticipation: "Regional"
 *         competitiveLevel: "Intermediate"
 *         hasOwnKart: true
 *         isTeamMember: false
 *         teamName: null
 *         usesTelemetry: true
 *         telemetryType: "AiM"
 *         attendsEvents: "Often"
 *         interestCategories: ["Sprint", "Endurance"]
 *         preferredTrack: "Interlagos"
 */
@Entity('MemberProfiles')
export class MemberProfile extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id' })
  user!: User;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ length: 100, nullable: false, default: '' })
  nickName!: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ length: 20, nullable: false, default: '' })
  gender!: string;

  @Column({ length: 100, nullable: false, default: '' })
  city!: string;

  @Column({ length: 2, nullable: false, default: '' })
  state!: string;

  @Column({ length: 20, nullable: false, default: '' })
  experienceTime!: string;

  @Column({ length: 20, nullable: false, default: '' })
  raceFrequency!: string;

  @Column({ length: 20, nullable: false, default: '' })
  championshipParticipation!: string;

  @Column({ length: 20, nullable: false, default: '' })
  competitiveLevel!: string;

  @Column({ nullable: false, default: false })
  hasOwnKart!: boolean;

  @Column({ nullable: false, default: false })
  isTeamMember!: boolean;

  @Column({ length: 100, nullable: true })
  teamName?: string;

  @Column({ nullable: false, default: false })
  usesTelemetry!: boolean;

  @Column({ length: 100, nullable: true })
  telemetryType?: string;

  @Column({ length: 20, nullable: false, default: '' })
  attendsEvents!: string;

  @Column('text', { array: true, nullable: false, default: [] })
  interestCategories!: string[];

  @Column({ length: 100, nullable: true })
  preferredTrack?: string;
} 