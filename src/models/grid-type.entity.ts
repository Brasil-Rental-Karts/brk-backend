import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum GridTypeEnum {
  SUPER_POLE = 'super_pole',
  INVERTED = 'inverted',
  INVERTED_PARTIAL = 'inverted_partial'
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GridType:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - type
 *         - championshipId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único do tipo de grid
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nome do tipo de grid
 *           example: "Super Pole"
 *         description:
 *           type: string
 *           description: Descrição de como funciona este tipo de grid
 *           example: "A volta mais rápida da classificação define a ordem de largada"
 *         type:
 *           type: string
 *           enum: [super_pole, inverted, inverted_partial]
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
 *           description: Número de posições invertidas (apenas para tipo inverted_partial)
 *           example: 10
 *         championshipId:
 *           type: string
 *           format: uuid
 *           description: ID do campeonato
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
@Entity('GridTypes')
export class GridType extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: GridTypeEnum, 
    nullable: false 
  })
  type: GridTypeEnum;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'int', nullable: true })
  invertedPositions?: number;

  // Relacionamento com o campeonato
  @Column({ nullable: false })
  championshipId: string;
} 