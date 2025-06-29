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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ReorderRegulationsDto {
  @IsUUID()
  @IsNotEmpty()
  seasonId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegulationOrderDto)
  regulationOrders: RegulationOrderDto[];
}

export class RegulationResponseDto {
  id: string;
  title: string;
  content: string;
  order: number;
  isActive: boolean;
  seasonId: string;
  createdAt: Date;
  updatedAt: Date;
} 