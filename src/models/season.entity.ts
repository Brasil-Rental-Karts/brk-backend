import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

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
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito', 
  BOLETO = 'boleto'
}

export interface Sponsor {
  id: string;
  name: string;
  logoImage: string;
  website?: string;
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

  // Patrocinadores
  @Column({ type: 'jsonb', nullable: true, default: [] })
  sponsors: Sponsor[];

  // Relacionamento com o campeonato
  @Column({ nullable: false })
  championshipId: string;
} 