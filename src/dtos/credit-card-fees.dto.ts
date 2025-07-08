import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { BaseDto } from './base.dto';

export class CreateCreditCardFeesDto extends BaseDto {
  @IsUUID()
  championshipId!: string;

  @IsString()
  installmentRange!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentageRate!: number;

  @IsNumber()
  @Min(0)
  fixedFee!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCreditCardFeesDto extends BaseDto {
  @IsOptional()
  @IsString()
  installmentRange?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 