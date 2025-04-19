import { IsString, IsOptional, IsUUID, Length, MinLength, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

export class CreateChampionshipDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  @Length(3, 500)
  description!: string;

  @IsUUID()
  clubId!: string;

  @IsUUID()
  @IsOptional()
  organizerId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateChampionshipDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(3, 500)
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  clubId?: string;

  @IsUUID()
  @IsOptional()
  organizerId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
} 