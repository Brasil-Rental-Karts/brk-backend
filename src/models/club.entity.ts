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
 *           example: Speed Kart Club
 *         foundationDate:
 *           type: string
 *           format: date
 *           description: Date when the club was founded
 *           example: 2015-03-15
 *         description:
 *           type: string
 *           description: Club's description
 *           example: Speed Kart Club é um clube de kartismo amador focado em competições de endurance e sprint, localizado em São Paulo...
 *         logoUrl:
 *           type: string
 *           description: URL to the club's logo
 *           example: https://example.com/logos/speed-kart-club.png
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