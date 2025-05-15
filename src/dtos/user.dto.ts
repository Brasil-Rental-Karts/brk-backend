import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, Length, MinLength } from 'class-validator';
import { BaseDto } from './base.dto';
import { UserRole } from '../models/user.entity';

/**
 * Data Transfer Object for creating a user
 */
export class CreateUserDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  @Length(5, 20)
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

/**
 * Data Transfer Object for updating a user
 */
export class UpdateUserDto extends BaseDto {
  @IsString()
  @Length(3, 100)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @Length(5, 20)
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
} 