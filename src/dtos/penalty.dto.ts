import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { PenaltyStatus, PenaltyType } from '../models/penalty.entity';
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

  @IsOptional()
  @IsEnum(PenaltyStatus)
  status?: PenaltyStatus;

  @IsOptional()
  isImported?: boolean;
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
  isImported: boolean;
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
