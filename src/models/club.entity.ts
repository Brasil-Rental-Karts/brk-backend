import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     Club:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Club's unique ID
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         name:
 *           type: string
 *           description: Club's name
 *           example: Manchester United FC
 *         foundationDate:
 *           type: string
 *           format: date
 *           description: Date when the club was founded
 *           example: 1878-01-01
 *         description:
 *           type: string
 *           description: Club's description
 *           example: Manchester United Football Club is a professional football club based in Old Trafford, Greater Manchester, England...
 *         logoUrl:
 *           type: string
 *           description: URL to the club's logo
 *           example: https://example.com/logos/manchester-united.png
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the club was created
 *           example: 2023-01-01T00:00:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the club was last updated
 *           example: 2023-01-01T00:00:00Z
 */
@Entity('Clubs')
export class Club extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'date', nullable: true })
  foundationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  logoUrl: string;
} 