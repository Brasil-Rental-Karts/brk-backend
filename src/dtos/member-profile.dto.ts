import { IsString, IsOptional, IsBoolean, IsArray, Length, IsISO8601, IsUUID } from 'class-validator';
import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpsertMemberProfileDto:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User ID (required for update, provided by token for create)
 *           example: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last login
 *           example: "2023-07-25T14:30:00Z"
 *         nickName:
 *           type: string
 *           maxLength: 100
 *           description: User's nickname
 *           example: "SpeedRacer"
 *         birthDate:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *           example: "1990-05-15"
 *         gender:
 *           type: string
 *           maxLength: 20
 *           description: User's gender
 *           example: "Male"
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: User's city
 *           example: "São Paulo"
 *         state:
 *           type: string
 *           maxLength: 2
 *           description: User's state (2-letter code)
 *           example: "SP"
 *         experienceTime:
 *           type: string
 *           maxLength: 20
 *           description: User's experience time
 *           example: "3-5 years"
 *         raceFrequency:
 *           type: string
 *           maxLength: 20
 *           description: User's race frequency
 *           example: "Weekly"
 *         championshipParticipation:
 *           type: string
 *           maxLength: 20
 *           description: User's championship participation
 *           example: "Regional"
 *         competitiveLevel:
 *           type: string
 *           maxLength: 20
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
 *           maxLength: 100
 *           description: User's team name
 *           example: "Racing Team"
 *         usesTelemetry:
 *           type: boolean
 *           description: Whether the user uses telemetry
 *           example: true
 *         telemetryType:
 *           type: string
 *           maxLength: 100
 *           description: User's telemetry type
 *           example: "AiM"
 *         attendsEvents:
 *           type: string
 *           maxLength: 20
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
 *           maxLength: 100
 *           description: User's preferred track
 *           example: "Interlagos"
 *       example:
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
export class UpsertMemberProfileDto extends BaseDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsOptional()
  lastLoginAt?: Date;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  nickName?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: Date;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  gender?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(1, 2)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  experienceTime?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  raceFrequency?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  championshipParticipation?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  competitiveLevel?: string;

  @IsBoolean()
  @IsOptional()
  hasOwnKart?: boolean;

  @IsBoolean()
  @IsOptional()
  isTeamMember?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  teamName?: string;

  @IsBoolean()
  @IsOptional()
  usesTelemetry?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  telemetryType?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  attendsEvents?: string;

  @IsArray()
  @IsOptional()
  interestCategories?: string[];

  @IsString()
  @IsOptional()
  @Length(1, 100)
  preferredTrack?: string;
} 