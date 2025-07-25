import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateVipPreregisterDto:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: User name
 *           example: "João Silva"
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *           description: User email address
 *           example: "joao.silva@example.com"
 */
export class CreateVipPreregisterDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(255, { message: 'Nome não pode exceder 255 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'Por favor, forneça um endereço de e-mail válido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @MaxLength(255, { message: 'E-mail não pode exceder 255 caracteres' })
  email!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateVipPreregisterDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: User name
 *           example: "João Silva"
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *           description: User email address
 *           example: "joao.silva@example.com"
 */
export class UpdateVipPreregisterDto extends BaseDto {
  @IsString()
  @MaxLength(255, { message: 'Nome não pode exceder 255 caracteres' })
  name?: string;

  @IsEmail({}, { message: 'Por favor, forneça um endereço de e-mail válido' })
  @MaxLength(255, { message: 'E-mail não pode exceder 255 caracteres' })
  email?: string;
}
