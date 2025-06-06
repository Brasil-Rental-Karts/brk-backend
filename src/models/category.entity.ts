import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('Categories')
export class Category extends BaseEntity {
  @Column({ length: 75, nullable: false })
  name: string;

  @Column({ length: 10, nullable: false })
  ballast: string; // mascara Kg

  @Column({ type: 'int', nullable: false })
  maxPilots: number;

  @Column({ type: 'int', nullable: false })
  batteryQuantity: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  startingGridFormat: string;

  @Column({ type: 'int', nullable: false })
  minimumAge: number;

  // Relacionamento com a temporada
  @Column({ nullable: false })
  seasonId: string;
} 