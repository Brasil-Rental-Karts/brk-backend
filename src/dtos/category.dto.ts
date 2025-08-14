import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  BatteriesConfig,
  validateBatteriesConfig,
} from '../types/category.types';
import { BaseDto } from './base.dto';

/**
 * DTO para resposta de categoria com contagem de inscritos
 */
export class CategoryResponseDto extends BaseDto {
  @IsString()
  name: string;

  @IsInt()
  ballast: number;

  @IsInt()
  maxPilots: number;

  @IsArray()
  batteriesConfig: BatteriesConfig;

  @IsInt()
  minimumAge: number;

  @IsUUID('4')
  seasonId: string;

  @IsOptional()
  @IsInt()
  registrationCount?: number;
}

/**
 * DTO para configuração de bateria individual
 */
export class BatteryConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da bateria é obrigatório' })
  name: string;

  @IsString()
  gridType: string;

  @IsString()
  scoringSystemId: string;

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Ordem deve ser um número inteiro' })
  @Min(0, { message: 'Ordem deve ser maior ou igual a 0' })
  order: number;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => Boolean(value))
  isRequired: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsInt({ message: 'Duração deve ser um número inteiro' })
  @Min(1, { message: 'Duração deve ser maior que 0' })
  duration?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateCategoryDto:
 *       type: object
 *       required:
 *         - name
 *         - ballast
 *         - maxPilots
 *         - batteriesConfig
 *         - minimumAge
 *         - seasonId
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 75
 *           description: Nome da categoria
 *           example: "Categoria A"
 *         ballast:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Lastro (máscara Kg)
 *           example: 75
 *         maxPilots:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Máximo de pilotos
 *           example: 20
 *         batteriesConfig:
 *           type: array
 *           description: Configuração das baterias
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da bateria
 *               gridType:
 *                 type: string
 *                 description: ID do tipo de grid
 *               scoringSystemId:
 *                 type: string
 *                 description: ID do sistema de pontuação
 *               order:
 *                 type: integer
 *                 description: Ordem da bateria
 *               isRequired:
 *                 type: boolean
 *                 description: Se é obrigatória
 *           example: [{"name": "Classificação", "gridType": "uuid", "scoringSystemId": "uuid", "order": 1, "isRequired": true}]
 *         minimumAge:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Idade mínima
 *           example: 18
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 */
export class CreateCategoryDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  @MaxLength(75, {
    message: 'Nome da categoria deve ter no máximo 75 caracteres',
  })
  name: string;

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Lastro deve ser um número inteiro' })
  @Min(0, { message: 'Lastro deve ser no mínimo 0' })
  @Max(999, { message: 'Lastro deve ser no máximo 999' })
  ballast: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(0, { message: 'Máximo de pilotos deve ser no mínimo 0' })
  @Max(999, { message: 'Máximo de pilotos deve ser no máximo 999' })
  maxPilots: number;

  @IsArray({ message: 'Configuração de baterias deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => BatteryConfigDto)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      const errors = validateBatteriesConfig(value);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
    }
    return value;
  })
  batteriesConfig: BatteryConfigDto[];

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Idade mínima deve ser um número inteiro' })
  @Min(0, { message: 'Idade mínima deve ser no mínimo 0' })
  @Max(999, { message: 'Idade mínima deve ser no máximo 999' })
  minimumAge: number;

  @IsUUID('4', { message: 'ID da temporada deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID da temporada é obrigatório' })
  seasonId: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateCategoryDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 75
 *           description: Nome da categoria
 *           example: "Categoria A"
 *         ballast:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Lastro (máscara Kg)
 *           example: 75
 *         maxPilots:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Máximo de pilotos
 *           example: 20
 *         batteriesConfig:
 *           type: array
 *           description: Configuração das baterias
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da bateria
 *               gridType:
 *                 type: string
 *                 description: ID do tipo de grid
 *               scoringSystemId:
 *                 type: string
 *                 description: ID do sistema de pontuação
 *               order:
 *                 type: integer
 *                 description: Ordem da bateria
 *               isRequired:
 *                 type: boolean
 *                 description: Se é obrigatória
 *           example: [{"name": "Classificação", "gridType": "uuid", "scoringSystemId": "uuid", "order": 1, "isRequired": true}]
 *         minimumAge:
 *           type: integer
 *           minimum: 0
 *           maximum: 999
 *           description: Idade mínima
 *           example: 18
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 */
export class UpdateCategoryDto extends BaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(75, {
    message: 'Nome da categoria deve ter no máximo 75 caracteres',
  })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsInt({ message: 'Lastro deve ser um número inteiro' })
  @Min(0, { message: 'Lastro deve ser no mínimo 0' })
  @Max(999, { message: 'Lastro deve ser no máximo 999' })
  ballast?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(0, { message: 'Máximo de pilotos deve ser no mínimo 0' })
  @Max(999, { message: 'Máximo de pilotos deve ser no máximo 999' })
  maxPilots?: number;

  @IsOptional()
  @IsArray({ message: 'Configuração de baterias deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => BatteryConfigDto)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      const errors = validateBatteriesConfig(value);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
    }
    return value;
  })
  batteriesConfig?: BatteryConfigDto[];

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsInt({ message: 'Idade mínima deve ser um número inteiro' })
  @Min(0, { message: 'Idade mínima deve ser no mínimo 0' })
  @Max(999, { message: 'Idade mínima deve ser no máximo 999' })
  minimumAge?: number;

  @IsOptional()
  @IsUUID('4', { message: 'ID da temporada deve ser um UUID válido' })
  seasonId?: string;
}
