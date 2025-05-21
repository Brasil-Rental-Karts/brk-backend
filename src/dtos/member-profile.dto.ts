import { IsString, IsOptional, IsBoolean, IsArray, Length, IsISO8601, IsUUID, IsNumber, IsInt, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { BaseDto } from './base.dto';
import { Type } from 'class-transformer';
import { 
  Gender, 
  KartExperienceYears, 
  RaceFrequency, 
  ChampionshipParticipation, 
  CompetitiveLevel, 
  AttendsEvents,
  InterestCategory
} from '../models/member-profile-enums';

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
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *           description: User's gender (0=Male, 1=Female, 2=Other, 3=PreferNotToSay)
 *           example: 0
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
 *           type: integer
 *           minimum: 0
 *           maximum: 4
 *           description: Kart experience years (0=Never, 1=LessThanOneYear, 2=OneToTwoYears, 3=ThreeToFiveYears, 4=MoreThanFiveYears)
 *           example: 2
 *         raceFrequency:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *           description: Race frequency (0=Rarely, 1=Regularly, 2=Weekly, 3=Daily)
 *           example: 2
 *         championshipParticipation:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *           description: Championship participation (0=Never, 1=LocalRegional, 2=State, 3=National)
 *           example: 1
 *         competitiveLevel:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
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
 *           type: integer
 *           minimum: 0
 *           maximum: 2
 *           description: User's event attendance (0=Yes, 1=No, 2=DependsOnDistance)
 *           example: 0
 *         interestCategories:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 0
 *             maximum: 6
 *           description: User's categories of interest (0=LightRentalKart, 1=HeavyRentalKart, 2=TwoStrokeKart, 3=Endurance, 4=Teams, 5=LongChampionships, 6=SingleRaces)
 *           example: [0, 1]
 *         preferredTrack:
 *           type: string
 *           maxLength: 100
 *           description: User's preferred track
 *           example: "Interlagos"
 *       example:
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

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3)
  gender?: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(1, 2)
  state?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(4)
  experienceTime?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3)
  raceFrequency?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3)
  championshipParticipation?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3)
  competitiveLevel?: number;

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

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(2)
  attendsEvents?: number;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  interestCategories?: number[];

  @IsString()
  @IsOptional()
  @Length(1, 100)
  preferredTrack?: string;
} 