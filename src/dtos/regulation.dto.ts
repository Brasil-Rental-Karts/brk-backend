import { IsString, IsEnum, IsUUID, IsArray, ValidateNested, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDto } from './base.dto';
import { RegulationStatus } from '../models/regulation.entity';

export class CreateRegulationSectionDto {
  @IsString()
  title: string;

  @IsString()
  markdownContent: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class UpdateRegulationSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  markdownContent?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class CreateRegulationDto extends BaseDto {
  @IsUUID()
  seasonId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRegulationSectionDto)
  sections: CreateRegulationSectionDto[];
}

export class UpdateRegulationDto extends BaseDto {
  @IsOptional()
  @IsEnum(RegulationStatus)
  status?: RegulationStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRegulationSectionDto)
  sections?: UpdateRegulationSectionDto[];
}

export class PublishRegulationDto extends BaseDto {
  // No additional fields needed
}

export class ReorderSectionsDto extends BaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderDto)
  sections: SectionOrderDto[];
}

class SectionOrderDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(1)
  order: number;
} 