import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  DefaultFleets,
  TrackLayouts,
  validateDefaultFleets,
  validateTrackLayouts,
} from '../types/race-track.types';
import { BaseDto } from './base.dto';

export class TrackLayoutDto extends BaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  length: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class DefaultFleetDto extends BaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  kartQuantity: number;
}

export class CreateRaceTrackDto extends BaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackLayoutDto)
  trackLayouts: TrackLayoutDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultFleetDto)
  defaultFleets: DefaultFleetDto[];

  @IsString()
  @IsOptional()
  generalInfo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Validação customizada para trackLayouts
  validateTrackLayouts(): string[] {
    return validateTrackLayouts(this.trackLayouts as TrackLayouts);
  }

  // Validação customizada para defaultFleets
  validateDefaultFleets(): string[] {
    return validateDefaultFleets(this.defaultFleets as DefaultFleets);
  }
}

export class UpdateRaceTrackDto extends BaseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackLayoutDto)
  @IsOptional()
  trackLayouts?: TrackLayoutDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultFleetDto)
  @IsOptional()
  defaultFleets?: DefaultFleetDto[];

  @IsString()
  @IsOptional()
  generalInfo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Validação customizada para trackLayouts
  validateTrackLayouts(): string[] {
    return validateTrackLayouts(this.trackLayouts as TrackLayouts);
  }

  // Validação customizada para defaultFleets
  validateDefaultFleets(): string[] {
    return validateDefaultFleets(this.defaultFleets as DefaultFleets);
  }
}

export class RaceTrackResponseDto {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  trackLayouts: TrackLayouts;
  defaultFleets: DefaultFleets;
  generalInfo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
