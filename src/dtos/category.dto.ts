import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BaseDto } from './base.dto';
import { BatteriesConfig, validateBatteriesConfig } from '../types/category.types';

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
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
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
 *           type: string
 *           maxLength: 10
 *           description: Lastro (máscara Kg)
 *           example: "75Kg"
 *         maxPilots:
 *           type: integer
 *           minimum: 1
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
 *           minimum: 1
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
  @MaxLength(75, { message: 'Nome da categoria deve ter no máximo 75 caracteres' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Lastro é obrigatório' })
  @MaxLength(10, { message: 'Lastro deve ter no máximo 10 caracteres' })
  ballast: string;

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(1, { message: 'Máximo de pilotos deve ser maior que 0' })
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
  @Min(1, { message: 'Idade mínima deve ser maior que 0' })
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
 *           type: string
 *           maxLength: 10
 *           description: Lastro (máscara Kg)
 *           example: "75Kg"
 *         maxPilots:
 *           type: integer
 *           minimum: 1
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
 *           minimum: 1
 *           description: Idade mínima
 *           example: 18
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 */
export class UpdateCategoryDto extends BaseDto {
  @IsString()
  @MaxLength(75, { message: 'Nome da categoria deve ter no máximo 75 caracteres' })
  name?: string;

  @IsString()
  @MaxLength(10, { message: 'Lastro deve ter no máximo 10 caracteres' })
  ballast?: string;

  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(1, { message: 'Máximo de pilotos deve ser maior que 0' })
  maxPilots?: number;

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

  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  @IsInt({ message: 'Idade mínima deve ser um número inteiro' })
  @Min(1, { message: 'Idade mínima deve ser maior que 0' })
  minimumAge?: number;

  @IsUUID('4', { message: 'ID da temporada deve ser um UUID válido' })
  seasonId?: string;
} 