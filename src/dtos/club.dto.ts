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
 *           example: Turbo Kart Racing
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description
 *           example: Turbo Kart Racing é um clube de kartismo dedicado a pilotos amadores que buscam aprimorar suas habilidades com treinamentos e competições regulares...
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
 *           example: Pro Kart Association
 *         description:
 *           type: string
 *           minLength: 3
 *           maxLength: 500
 *           description: Club's description
 *           example: Pro Kart Association é uma associação de pilotos de kart focada em desenvolvimento profissional, com acesso a pistas oficiais e equipamentos de última geração...
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