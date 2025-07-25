import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

import { UserRole } from '../models/user.entity';
import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserDto:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password
 *         phone:
 *           type: string
 *           minLength: 5
 *           maxLength: 20
 *           description: User's phone number (optional)
 *         role:
 *           type: string
 *           enum: [ADMINISTRATOR, MANAGER, MEMBER]
 *           description: User's role in the system (optional)
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
 * @swagger
 * components:
 *   schemas:
 *     UpdateUserDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: User's full name (optional)
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (optional)
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password (optional)
 *         phone:
 *           type: string
 *           minLength: 5
 *           maxLength: 20
 *           description: User's phone number (optional)
 *         role:
 *           type: string
 *           enum: [ADMINISTRATOR, MANAGER, MEMBER]
 *           description: User's role in the system (optional)
 *         active:
 *           type: boolean
 *           description: Whether the user account is active (optional)
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
