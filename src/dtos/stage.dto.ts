import { IsString, IsNotEmpty, MaxLength, IsBoolean, IsOptional, IsArray, IsUUID, IsDateString, Matches, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
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
 *         - kartodrome
 *         - kartodromeAddress
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
 *         kartodrome:
 *           type: string
 *           maxLength: 255
 *           description: Nome do kartódromo
 *           example: "Kartódromo Granja Viana"
 *         kartodromeAddress:
 *           type: string
 *           description: Endereço completo do kartódromo
 *           example: "Rodovia Raposo Tavares, km 26,5 - Granja Viana, Cotia - SP"
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
  @MaxLength(255, { message: 'Nome da etapa deve ter no máximo 255 caracteres' })
  name: string;

  @Type(() => Date)
  @IsDate({ message: 'Data inválida' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  date: Date;

  @IsString()
  @IsNotEmpty({ message: 'Horário é obrigatório' })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário deve estar no formato HH:MM' })
  time: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome do kartódromo é obrigatório' })
  @MaxLength(255, { message: 'Nome do kartódromo deve ter no máximo 255 caracteres' })
  kartodrome: string;

  @IsString()
  @IsNotEmpty({ message: 'Endereço do kartódromo é obrigatório' })
  kartodromeAddress: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  @MaxLength(500, { message: 'Link de transmissão deve ter no máximo 500 caracteres' })
  streamLink?: string;

  @IsUUID(4, { message: 'ID da temporada deve ser um UUID válido' })
  seasonId: string;

  @IsArray({ message: 'IDs das categorias deve ser um array' })
  @IsUUID(4, { each: true, message: 'Cada ID de categoria deve ser um UUID válido' })
  categoryIds: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doublePoints deve ser um boolean' })
  doublePoints?: boolean = false;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário do briefing deve estar no formato HH:MM' })
  briefingTime?: string;
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
 *         kartodrome:
 *           type: string
 *           maxLength: 255
 *           description: Nome do kartódromo
 *           example: "Kartódromo Granja Viana"
 *         kartodromeAddress:
 *           type: string
 *           description: Endereço completo do kartódromo
 *           example: "Rodovia Raposo Tavares, km 26,5 - Granja Viana, Cotia - SP"
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
  @MaxLength(255, { message: 'Nome da etapa deve ter no máximo 255 caracteres' })
  name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data inválida' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  date?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário deve estar no formato HH:MM' })
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Nome do kartódromo deve ter no máximo 255 caracteres' })
  kartodrome?: string;

  @IsOptional()
  @IsString()
  kartodromeAddress?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  @MaxLength(500, { message: 'Link de transmissão deve ter no máximo 500 caracteres' })
  streamLink?: string;

  @IsOptional()
  @IsArray({ message: 'IDs das categorias deve ser um array' })
  @IsUUID(4, { each: true, message: 'Cada ID de categoria deve ser um UUID válido' })
  categoryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'doublePoints deve ser um boolean' })
  doublePoints?: boolean;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário do briefing deve estar no formato HH:MM' })
  briefingTime?: string;

  @IsOptional()
  @Transform(({ value }) => value)
  // @IsArray({ message: 'Frotas deve ser um array' })
  fleets?: any[];
} 