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
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description (optional)
 *         active:
 *           type: boolean
 *           description: Whether the club is active (optional)
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
 *           description: Club's name (optional)
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description (optional)
 *         active:
 *           type: boolean
 *           description: Whether the club is active (optional)
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