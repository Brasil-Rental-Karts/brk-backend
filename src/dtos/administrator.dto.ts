import { IsString, IsOptional, IsUUID, Length, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

export class CreateAdministratorDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  @Length(3, 500)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateAdministratorDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(3, 500)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}