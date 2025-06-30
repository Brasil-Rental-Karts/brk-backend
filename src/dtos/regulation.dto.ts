import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RegulationOrderDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;
  
  @IsNumber()
  @IsNotEmpty()
  order: number;
}

export class CreateRegulationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsNotEmpty()
  seasonId: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class UpdateRegulationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class ReorderRegulationsDto {
  @IsString()
  @IsNotEmpty()
  seasonId: string;

  @IsString({ each: true })
  @IsNotEmpty()
  regulationIds: string[];
}

export class RegulationResponseDto {
  id: string;
  title: string;
  content: string;
  order: number;
  seasonId: string;
  createdAt: string;
  updatedAt: string;
} 