import { IsString, IsOptional, IsUUID, Length, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateClubDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: Club's name
 *           example: Arsenal FC
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description
 *           example: Arsenal Football Club is a professional football club based in Islington, London, England...
 *         active:
 *           type: boolean
 *           description: Whether the club is active
 *           example: true
 */
export class CreateClubDto extends BaseDto {
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

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateClubDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: Club's name
 *           example: Arsenal FC
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description
 *           example: Arsenal Football Club is a professional football club based in Islington, London, England...
 *         active:
 *           type: boolean
 *           description: Whether the club is active
 *           example: true
 */
export class UpdateClubDto extends BaseDto {
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