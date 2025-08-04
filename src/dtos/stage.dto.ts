import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateStageDto:
 *       type: object
 *       required:
 *         - name
 *         - date
 *         - time
 *         - raceTrackId
 *         - seasonId
 *         - categoryIds
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Nome da etapa
 *           example: "Etapa 1 - Abertura"
 *         date:
 *           type: string
 *           format: date
 *           description: Data da etapa
 *           example: "2024-03-15"
 *         time:
 *           type: string
 *           pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Horário da etapa (HH:MM)
 *           example: "14:30"
 *         raceTrackId:
 *           type: string
 *           format: uuid
 *           description: ID do kartódromo
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         streamLink:
 *           type: string
 *           maxLength: 500
 *           description: Link de transmissão (opcional)
 *           example: "https://youtube.com/watch?v=123"
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *         categoryIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: IDs das categorias participantes
 *         doublePoints:
 *           type: boolean
 *           description: Se a pontuação é em dobro
 *           default: false
 *         doubleRound:
 *           type: boolean
 *           description: Se é uma rodada dupla
 *           default: false
 *         briefing:
 *           type: string
 *           description: Texto do briefing (opcional)
 *         briefingTime:
 *           type: string
 *           pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Horário do briefing (HH:MM) (opcional)
 */
export class CreateStageDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da etapa é obrigatório' })
  @MaxLength(255, {
    message: 'Nome da etapa deve ter no máximo 255 caracteres',
  })
  name: string;

  @Type(() => Date)
  @IsDate({ message: 'Data inválida' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  date: Date;

  @IsString()
  @IsNotEmpty({ message: 'Horário é obrigatório' })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:MM',
  })
  time: string;

  @IsUUID(4, { message: 'ID do kartódromo deve ser um UUID válido' })
  raceTrackId: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(255, {
    message: 'ID do traçado deve ter no máximo 255 caracteres',
  })
  trackLayoutId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(500, {
    message: 'Link de transmissão deve ter no máximo 500 caracteres',
  })
  streamLink?: string;

  @IsUUID(4, { message: 'ID da temporada deve ser um UUID válido' })
  seasonId: string;

  @IsArray({ message: 'IDs das categorias deve ser um array' })
  @IsUUID(4, {
    each: true,
    message: 'Cada ID de categoria deve ser um UUID válido',
  })
  categoryIds: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doublePoints deve ser um boolean' })
  doublePoints?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doubleRound deve ser um boolean' })
  doubleRound?: boolean = false;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário do briefing deve estar no formato HH:MM',
  })
  briefingTime?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  @IsNumber({}, { message: 'Preço deve ser um número válido' })
  @Min(0, { message: 'Preço deve ser maior ou igual a zero' })
  price?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateStageDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Nome da etapa
 *           example: "Etapa 1 - Abertura"
 *         date:
 *           type: string
 *           format: date
 *           description: Data da etapa
 *           example: "2024-03-15"
 *         time:
 *           type: string
 *           pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Horário da etapa (HH:MM)
 *           example: "14:30"
 *         raceTrackId:
 *           type: string
 *           format: uuid
 *           description: ID do kartódromo
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         streamLink:
 *           type: string
 *           maxLength: 500
 *           description: Link de transmissão (opcional)
 *           example: "https://youtube.com/watch?v=123"
 *         categoryIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: IDs das categorias participantes
 *         doublePoints:
 *           type: boolean
 *           description: Se a pontuação é em dobro
 *         doubleRound:
 *           type: boolean
 *           description: Se é uma rodada dupla
 *         briefing:
 *           type: string
 *           description: Texto do briefing (opcional)
 *         briefingTime:
 *           type: string
 *           pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Horário do briefing (HH:MM) (opcional)
 */
export class UpdateStageDto extends BaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: 'Nome da etapa deve ter no máximo 255 caracteres',
  })
  name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data inválida' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  date?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:MM',
  })
  time?: string;

  @IsOptional()
  @IsUUID(4, { message: 'ID do kartódromo deve ser um UUID válido' })
  raceTrackId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(255, {
    message: 'ID do traçado deve ter no máximo 255 caracteres',
  })
  trackLayoutId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(500, {
    message: 'Link de transmissão deve ter no máximo 500 caracteres',
  })
  streamLink?: string;

  @IsOptional()
  @IsArray({ message: 'IDs das categorias deve ser um array' })
  @IsUUID(4, {
    each: true,
    message: 'Cada ID de categoria deve ser um UUID válido',
  })
  categoryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doublePoints deve ser um boolean' })
  doublePoints?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doubleRound deve ser um boolean' })
  doubleRound?: boolean;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário do briefing deve estar no formato HH:MM',
  })
  briefingTime?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  @IsNumber({}, { message: 'Preço deve ser um número válido' })
  @Min(0, { message: 'Preço deve ser maior ou igual a zero' })
  price?: number;

  @IsOptional()
  @Transform(({ value }) => value)
  // @IsArray({ message: 'Frotas deve ser um array' })
  fleets?: any[];
}
