import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BatteriesConfig } from '../types/category.types';

@Entity('Categories')
export class Category extends BaseEntity {
  @Column({ length: 75, nullable: false })
  name: string;

  @Column({ length: 10, nullable: false })
  ballast: string; // mascara Kg

  @Column({ type: 'int', nullable: false })
  maxPilots: number;

  @Column({ type: 'jsonb', nullable: false })
  batteriesConfig: BatteriesConfig;

  @Column({ type: 'int', nullable: false })
  minimumAge: number;

  // Relacionamento com a temporada
  @Column({ nullable: false })
  seasonId: string;
} 