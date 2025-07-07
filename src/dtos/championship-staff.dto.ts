import { IsEmail, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { BaseDto } from './base.dto';
import { StaffPermissions } from '../models/championship-staff.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     AddStaffMemberDto:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário a ser adicionado ao staff
 *         permissions:
 *           type: object
 *           description: Permissões específicas do membro do staff
 *           properties:
 *             seasons:
 *               type: boolean
 *               description: Pode gerenciar temporadas
 *             categories:
 *               type: boolean
 *               description: Pode gerenciar categorias
 *             stages:
 *               type: boolean
 *               description: Pode gerenciar etapas
 *             pilots:
 *               type: boolean
 *               description: Pode gerenciar pilotos
 *             classification:
 *               type: boolean
 *               description: Pode acessar aba de classificação
 *             regulations:
 *               type: boolean
 *               description: Pode gerenciar regulamentos
 *             raceDay:
 *               type: boolean
 *               description: Pode acessar funcionalidades do dia da corrida
 *             editChampionship:
 *               type: boolean
 *               description: Pode editar dados do campeonato
 *             gridTypes:
 *               type: boolean
 *               description: Pode gerenciar tipos de grid
 *             scoringSystems:
 *               type: boolean
 *               description: Pode gerenciar sistemas de pontuação
 *             sponsors:
 *               type: boolean
 *               description: Pode gerenciar patrocinadores
 *             staff:
 *               type: boolean
 *               description: Pode gerenciar equipe do staff
 *             asaasAccount:
 *               type: boolean
 *               description: Pode gerenciar conta Asaas
 */
export class AddStaffMemberDto extends BaseDto {
  @IsEmail({}, { message: 'Por favor, forneça um email válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email!: string;

  @IsOptional()
  @IsObject()
  permissions?: StaffPermissions;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateStaffMemberDto:
 *       type: object
 *       properties:
 *         permissions:
 *           type: object
 *           description: Permissões específicas do membro do staff
 */
export class UpdateStaffMemberDto extends BaseDto {
  @IsOptional()
  @IsObject()
  permissions?: StaffPermissions;
} 