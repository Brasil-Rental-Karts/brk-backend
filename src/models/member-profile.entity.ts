import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

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
 *           type: number
 *           description: User's gender (0=Male, 1=Female, 2=Other, 3=PreferNotToSay)
 *           example: 0
 *         city:
 *           type: string
 *           description: User's city
 *           example: "São Paulo"
 *         state:
 *           type: string
 *           description: User's state (2-letter code)
 *           example: "SP"
 *         experienceTime:
 *           type: number
 *           description: Kart experience years (0=Never, 1=LessThanOneYear, 2=OneToTwoYears, 3=ThreeToFiveYears, 4=MoreThanFiveYears)
 *           example: 2
 *         raceFrequency:
 *           type: number
 *           description: Race frequency (0=Rarely, 1=Regularly, 2=Weekly, 3=Daily)
 *           example: 2
 *         championshipParticipation:
 *           type: number
 *           description: Championship participation (0=Never, 1=LocalRegional, 2=State, 3=National)
 *           example: 1
 *         competitiveLevel:
 *           type: number
 *           description: User's competitive level (0=Beginner, 1=Intermediate, 2=Competitive, 3=Professional)
 *           example: 1
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
 *           type: number
 *           description: User's event attendance (0=Yes, 1=No, 2=DependsOnDistance)
 *           example: 0
 *         interestCategories:
 *           type: array
 *           items:
 *             type: number
 *           description: User's categories of interest (0=LightRentalKart, 1=HeavyRentalKart, 2=TwoStrokeKart, 3=Endurance, 4=Teams, 5=LongChampionships, 6=SingleRaces)
 *           example: [0, 1]
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
 *         profileCompleted:
 *           type: boolean
 *           description: Whether the profile is completed
 *           example: true
 *       example:
 *         id: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
 *         createdAt: "2023-01-15T10:30:00Z"
 *         updatedAt: "2023-07-25T14:45:00Z"
 *         lastLoginAt: "2023-07-25T14:30:00Z"
 *         nickName: "SpeedRacer"
 *         birthDate: "1990-05-15"
 *         gender: 0
 *         city: "São Paulo"
 *         state: "SP"
 *         experienceTime: 2
 *         raceFrequency: 2
 *         championshipParticipation: 1
 *         competitiveLevel: 1
 *         hasOwnKart: true
 *         isTeamMember: false
 *         teamName: null
 *         usesTelemetry: true
 *         telemetryType: "AiM"
 *         attendsEvents: 0
 *         interestCategories: [0, 1]
 *         preferredTrack: "Interlagos"
 *         profileCompleted: true
 */
@Entity('MemberProfiles')
export class MemberProfile extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id' })
  user!: User;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastLoginAt!: Date;

  @Column({ length: 100, nullable: false, default: '' })
  nickName!: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ type: 'smallint', nullable: true })
  gender?: number;

  @Column({ length: 100, nullable: false, default: '' })
  city!: string;

  @Column({ length: 2, nullable: false, default: '' })
  state!: string;

  @Column({ type: 'smallint', nullable: true })
  experienceTime?: number;

  @Column({ type: 'smallint', nullable: true })
  raceFrequency?: number;

  @Column({ type: 'smallint', nullable: true })
  championshipParticipation?: number;

  @Column({ type: 'smallint', nullable: true })
  competitiveLevel?: number;

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

  @Column({ type: 'smallint', nullable: true })
  attendsEvents?: number;

  @Column('smallint', { array: true, nullable: true })
  interestCategories?: number[];

  @Column({ length: 100, nullable: true })
  preferredTrack?: string;

  @Column({ nullable: false, default: false })
  profileCompleted!: boolean;
}
