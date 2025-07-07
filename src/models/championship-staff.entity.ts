import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Championship } from './championship.entity';

export enum StaffRole {
  STAFF = 'staff'
}

export interface StaffPermissions {
  seasons?: boolean;
  categories?: boolean;
  stages?: boolean;
  pilots?: boolean;
  classification?: boolean;
  regulations?: boolean;
  raceDay?: boolean;
  editChampionship?: boolean;
  gridTypes?: boolean;
  scoringSystems?: boolean;
  sponsors?: boolean;
  staff?: boolean;
  asaasAccount?: boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ChampionshipStaff:
 *       type: object
 *       required:
 *         - championshipId
 *         - userId
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único do membro do staff
 *         championshipId:
 *           type: string
 *           format: uuid
 *           description: ID do campeonato
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID do usuário
 *         role:
 *           type: string
 *           enum: [staff]
 *           description: Papel do usuário no campeonato
 *         isActive:
 *           type: boolean
 *           description: Se o membro do staff está ativo
 *         addedById:
 *           type: string
 *           format: uuid
 *           description: ID do usuário que adicionou este membro ao staff
 *         addedAt:
 *           type: string
 *           format: date-time
 *           description: Data em que foi adicionado ao staff
 *         removedAt:
 *           type: string
 *           format: date-time
 *           description: Data em que foi removido do staff (se aplicável)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
@Entity('ChampionshipStaff')
@Index(['championshipId', 'userId'], { unique: true })
export class ChampionshipStaff extends BaseEntity {
  @Column({ name: 'championshipId', nullable: false })
  championshipId: string;

  @Column({ name: 'userId', nullable: false })
  userId: string;

  @Column({ 
    type: 'enum', 
    enum: StaffRole, 
    default: StaffRole.STAFF 
  })
  role: StaffRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'addedById', nullable: false })
  addedById: string;

  @Column({ name: 'addedAt', type: 'timestamptz', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  addedAt: Date;

  @Column({ name: 'removedAt', type: 'timestamptz', nullable: true })
  removedAt: Date;

  @Column({ 
    type: 'jsonb', 
    default: () => "'{}'::jsonb",
    nullable: true 
  })
  permissions: StaffPermissions;

  // Relacionamentos
  @ManyToOne(() => Championship, championship => championship.id, { onDelete: 'CASCADE' })
  championship: Championship;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'addedById' })
  addedBy: User;
} 