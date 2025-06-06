import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsUUID } from 'class-validator';
import { BaseDto } from './base.dto';

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
 *         - batteryQuantity
 *         - startingGridFormat
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
 *         batteryQuantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantidade de baterias
 *           example: 2
 *         startingGridFormat:
 *           type: string
 *           description: Formato de grid de largada
 *           example: "2x2"
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

  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(1, { message: 'Máximo de pilotos deve ser maior que 0' })
  maxPilots: number;

  @IsInt({ message: 'Quantidade de baterias deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade de baterias deve ser maior que 0' })
  batteryQuantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Formato de grid de largada é obrigatório' })
  startingGridFormat: string;

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
 *         batteryQuantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantidade de baterias
 *           example: 2
 *         startingGridFormat:
 *           type: string
 *           description: Formato de grid de largada
 *           example: "2x2"
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

  @IsInt({ message: 'Máximo de pilotos deve ser um número inteiro' })
  @Min(1, { message: 'Máximo de pilotos deve ser maior que 0' })
  maxPilots?: number;

  @IsInt({ message: 'Quantidade de baterias deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade de baterias deve ser maior que 0' })
  batteryQuantity?: number;

  @IsString()
  startingGridFormat?: string;

  @IsInt({ message: 'Idade mínima deve ser um número inteiro' })
  @Min(1, { message: 'Idade mínima deve ser maior que 0' })
  minimumAge?: number;

  @IsUUID('4', { message: 'ID da temporada deve ser um UUID válido' })
  seasonId?: string;
} 