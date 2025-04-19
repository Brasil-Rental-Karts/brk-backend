import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, Length, MinLength } from 'class-validator';
import { BaseDto } from './base.dto';
import { UserRole } from '../models/user.entity';

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
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User's password
 *           example: securePassword123
 *         phone:
 *           type: string
 *           minLength: 5
 *           maxLength: 20
 *           description: User's phone number (optional)
 *           example: +1234567890
 *         role:
 *           type: string
 *           enum: [Member, Administrator]
 *           description: User's role (optional, defaults to Member)
 *           example: Member
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
 *           description: User's full name
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User's password
 *           example: securePassword123
 *         phone:
 *           type: string
 *           minLength: 5
 *           maxLength: 20
 *           description: User's phone number
 *           example: +1234567890
 *         role:
 *           type: string
 *           enum: [Member, Administrator]
 *           description: User's role
 *           example: Member
 *         active:
 *           type: boolean
 *           description: User's active status
 *           example: true
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