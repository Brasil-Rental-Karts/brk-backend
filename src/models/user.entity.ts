import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum: [Member, Administrator]
 */
export enum UserRole {
  MEMBER = 'Member',
  ADMINISTRATOR = 'Administrator'
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User's unique ID
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         name:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         phone:
 *           type: string
 *           description: User's phone number
 *           example: +1234567890
 *         role:
 *           $ref: '#/components/schemas/UserRole'
 *         registrationDate:
 *           type: string
 *           format: date
 *           description: Date when the user registered
 *           example: 2023-01-01
 *         active:
 *           type: boolean
 *           description: Whether the user is active
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the user was created
 *           example: 2023-01-01T00:00:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the user was last updated
 *           example: 2023-01-01T00:00:00Z
 */
@Entity('Users')
export class User extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string = '';

  @Column({ length: 100, nullable: false, unique: true })
  email: string = '';

  @Column({ length: 20, nullable: true })
  phone: string = '';

  @Column({ length: 100, nullable: false })
  password: string = '';

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    default: UserRole.MEMBER 
  })
  role: UserRole = UserRole.MEMBER;

  @Column({ type: 'date', nullable: false })
  registrationDate: Date = new Date();

  @Column({ default: true })
  active: boolean = true;
} 