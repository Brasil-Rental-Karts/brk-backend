import { IsEnum, IsString, IsOptional, IsNumber, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { PenaltyType, PenaltyStatus } from '../models/penalty.entity';
import { BaseDto } from './base.dto';

export class CreatePenaltyDto extends BaseDto {
  @IsEnum(PenaltyType)
  type: PenaltyType;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timePenaltySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  positionPenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  suspensionStages?: number;

  @IsOptional()
  @IsDateString()
  suspensionUntil?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  batteryIndex?: number;

  @IsUUID()
  userId: string;

  @IsUUID()
  championshipId: string;

  @IsOptional()
  @IsUUID()
  seasonId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class UpdatePenaltyDto extends BaseDto {
  @IsOptional()
  @IsEnum(PenaltyStatus)
  status?: PenaltyStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timePenaltySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  positionPenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  suspensionStages?: number;

  @IsOptional()
  @IsDateString()
  suspensionUntil?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  batteryIndex?: number;
}

export class AppealPenaltyDto extends BaseDto {
  @IsString()
  appealReason: string;
}

export class PenaltyResponseDto {
  id: string;
  type: PenaltyType;
  status: PenaltyStatus;
  reason: string;
  description?: string;
  timePenaltySeconds?: number;
  positionPenalty?: number;
  suspensionStages?: number;
  suspensionUntil?: Date;
  batteryIndex?: number;
  userId: string;
  championshipId: string;
  seasonId?: string;
  stageId?: string;
  categoryId?: string;
  appliedByUserId: string;
  appealReason?: string;
  appealedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  appliedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  appealedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  championship?: {
    id: string;
    name: string;
  };
  season?: {
    id: string;
    name: string;
  };
  stage?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
} 