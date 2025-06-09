import { IsString, IsNotEmpty, MaxLength, IsBoolean, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseDto } from './base.dto';
import { GridTypeEnum } from '../models/grid-type.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateGridTypeDto:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nome do tipo de grid
 *           example: "Super Pole Personalizado"
 *         description:
 *           type: string
 *           description: Descrição de como funciona este tipo de grid
 *           example: "A volta mais rápida da classificação define a ordem de largada"
 *         type:
 *           type: string
 *           enum: [super_pole, inverted, inverted_partial, qualifying_session]
 *           description: Tipo de grid
 *           example: "super_pole"
 *         isActive:
 *           type: boolean
 *           description: Se o tipo de grid está ativo
 *           default: true
 *           example: true
 *         isDefault:
 *           type: boolean
 *           description: Se é o tipo de grid padrão do campeonato
 *           default: false
 *           example: false
 *         invertedPositions:
 *           type: integer
 *           minimum: 1
 *           description: Número de posições invertidas (obrigatório para tipo inverted_partial)
 *           example: 10
 *         qualifyingDuration:
 *           type: integer
 *           minimum: 1
 *           description: Duração da sessão de classificação em minutos (obrigatório para tipo qualifying_session)
 *           example: 5
 */
export class CreateGridTypeDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do tipo de grid é obrigatório' })
  @MaxLength(100, { message: 'Nome do tipo de grid deve ter no máximo 100 caracteres' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @IsEnum(GridTypeEnum, { message: 'Tipo de grid inválido' })
  type: GridTypeEnum;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive deve ser um boolean' })
  isActive?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isDefault deve ser um boolean' })
  isDefault?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Número de posições invertidas deve ser um número inteiro' })
  @Min(1, { message: 'Número de posições invertidas deve ser maior que 0' })
  invertedPositions?: number;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Duração da classificação deve ser um número inteiro' })
  @Min(1, { message: 'Duração da classificação deve ser maior que 0' })
  qualifyingDuration?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateGridTypeDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nome do tipo de grid
 *           example: "Super Pole Personalizado"
 *         description:
 *           type: string
 *           description: Descrição de como funciona este tipo de grid
 *           example: "A volta mais rápida da classificação define a ordem de largada"
 *         type:
 *           type: string
 *           enum: [super_pole, inverted, inverted_partial, qualifying_session]
 *           description: Tipo de grid
 *           example: "super_pole"
 *         isActive:
 *           type: boolean
 *           description: Se o tipo de grid está ativo
 *           example: true
 *         isDefault:
 *           type: boolean
 *           description: Se é o tipo de grid padrão do campeonato
 *           example: false
 *         invertedPositions:
 *           type: integer
 *           minimum: 1
 *           description: Número de posições invertidas (obrigatório para tipo inverted_partial)
 *           example: 10
 *         qualifyingDuration:
 *           type: integer
 *           minimum: 1
 *           description: Duração da sessão de classificação em minutos (obrigatório para tipo qualifying_session)
 *           example: 5
 */
export class UpdateGridTypeDto extends BaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nome do tipo de grid deve ter no máximo 100 caracteres' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GridTypeEnum, { message: 'Tipo de grid inválido' })
  type?: GridTypeEnum;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive deve ser um boolean' })
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isDefault deve ser um boolean' })
  isDefault?: boolean;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Número de posições invertidas deve ser um número inteiro' })
  @Min(1, { message: 'Número de posições invertidas deve ser maior que 0' })
  invertedPositions?: number;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Duração da classificação deve ser um número inteiro' })
  @Min(1, { message: 'Duração da classificação deve ser maior que 0' })
  qualifyingDuration?: number;
} 