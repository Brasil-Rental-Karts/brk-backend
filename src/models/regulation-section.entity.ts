import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Regulation } from './regulation.entity';

@Entity('RegulationSections')
export class RegulationSection extends BaseEntity {
  @Column({ length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  markdownContent: string;

  @Column({ type: 'int', nullable: false })
  order: number;

  // Relacionamento com o regulamento
  @Column({ nullable: false })
  regulationId: string;

  @ManyToOne(() => Regulation, (regulation) => regulation.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'regulationId' })
  regulation: Regulation;
} 