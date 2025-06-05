import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     VipPreregister:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier
 *         name:
 *           type: string
 *           description: User name
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Registration date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */
@Entity('vip_preregister')
export class VipPreregister extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true
  })
  email!: string;
} 