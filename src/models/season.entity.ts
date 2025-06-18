import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';
import { Category } from './category.entity';

export enum SeasonStatus {
  AGENDADO = 'agendado',
  EM_ANDAMENTO = 'em_andamento', 
  CANCELADO = 'cancelado',
  FINALIZADO = 'finalizado'
}

export enum InscriptionType {
  MENSAL = 'mensal',
  ANUAL = 'anual', 
  SEMESTRAL = 'semestral',
  TRIMESTRAL = 'trimestral'
}

export enum PaymentMethod {
  PIX = 'pix',
  CARTAO_CREDITO = 'cartao_credito',
  BOLETO = 'boleto'
}

@Entity('Seasons')
export class Season extends BaseEntity {
  // Dados Gerais
  @Column({ length: 75, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  seasonImage: string;

  @Column({ type: 'varchar', length: 1000, nullable: false })
  description: string;

  @Column({ type: 'timestamptz', nullable: false })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endDate: Date;

  @Column({ 
    type: 'enum', 
    enum: SeasonStatus, 
    default: SeasonStatus.AGENDADO 
  })
  status: SeasonStatus;

  // Dados Financeiros
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  inscriptionValue: number;

  @Column({ 
    type: 'enum', 
    enum: InscriptionType, 
    nullable: false 
  })
  inscriptionType: InscriptionType;

  @Column({ type: 'simple-array', nullable: false })
  paymentMethods: PaymentMethod[];

  // Relacionamento com o campeonato
  @Column({ nullable: false })
  championshipId: string;

  @ManyToOne(() => Championship, (championship) => championship.seasons)
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;

  @OneToMany(() => Category, (category) => category.season)
  categories: Category[];
} 