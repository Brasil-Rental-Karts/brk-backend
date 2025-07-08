import { Entity, Column, ManyToOne, JoinColumn, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';
import { Category } from './category.entity';
import { Regulation } from './regulation.entity';
import { slugify } from '../utils/slugify';

export enum SeasonStatus {
  AGENDADO = 'agendado',
  EM_ANDAMENTO = 'em_andamento', 
  CANCELADO = 'cancelado',
  FINALIZADO = 'finalizado'
}

export enum InscriptionType {
  POR_TEMPORADA = 'por_temporada',
  POR_ETAPA = 'por_etapa'
}

export enum PaymentMethod {
  PIX = 'pix',
  CARTAO_CREDITO = 'cartao_credito'
}

export interface PaymentCondition {
  type: 'por_temporada' | 'por_etapa';
  value: number;
  description?: string;
  enabled: boolean;
  paymentMethods: PaymentMethod[];
  pixInstallments?: number;
  creditCardInstallments?: number;
}

@Entity('Seasons')
export class Season extends BaseEntity {
  // Dados Gerais
  @Column({ length: 75, nullable: false })
  name: string;

  @Column({ length: 100, unique: true, nullable: false })
  slug: string;

  @Column({ type: 'varchar', length: 1000, nullable: false })
  description: string;

  @Column({ type: 'timestamptz', nullable: false })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endDate: Date;

  @Column({ 
    type: 'enum', 
    enum: SeasonStatus, 
    default: SeasonStatus.AGENDADO,
    nullable: false
  })
  status: SeasonStatus;

  // Controle de Inscrições
  @Column({ type: 'boolean', default: true })
  registrationOpen: boolean;

  // Controle de Regulamento
  @Column({ type: 'boolean', default: false })
  regulationsEnabled: boolean;

  // Dados Financeiros - Nova estrutura para múltiplas condições
  @Column({ type: 'jsonb', nullable: false, default: () => "'[]'" })
  paymentConditions: PaymentCondition[];

  // Relacionamento com o campeonato
  @Column({ nullable: false })
  championshipId: string;

  @ManyToOne(() => Championship, (championship) => championship.seasons)
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;

  @OneToMany(() => Category, (category) => category.season)
  categories: Category[];

  @OneToMany(() => Regulation, (regulation) => regulation.season)
  regulations: Regulation[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.name) {
      this.slug = slugify(this.name);
    }
  }

  // Métodos auxiliares para compatibilidade
  getInscriptionValue(): number {
    if (this.paymentConditions && this.paymentConditions.length > 0) {
      // Retorna o valor da primeira condição ativa por temporada
      const tempCondition = this.paymentConditions.find(c => c.type === 'por_temporada' && c.enabled);
      return tempCondition ? tempCondition.value : 0;
    }
    return 0;
  }

  getInscriptionType(): InscriptionType {
    if (this.paymentConditions && this.paymentConditions.length > 0) {
      // Se há condições por etapa ativas, retorna por_etapa
      const hasStageConditions = this.paymentConditions.some(c => c.type === 'por_etapa' && c.enabled);
      return hasStageConditions ? InscriptionType.POR_ETAPA : InscriptionType.POR_TEMPORADA;
    }
    return InscriptionType.POR_TEMPORADA;
  }

  hasPaymentCondition(type: 'por_temporada' | 'por_etapa'): boolean {
    return this.paymentConditions?.some(c => c.type === type && c.enabled) || false;
  }

  getPaymentCondition(type: 'por_temporada' | 'por_etapa'): PaymentCondition | undefined {
    return this.paymentConditions?.find(c => c.type === type && c.enabled);
  }

  // Métodos auxiliares para métodos de pagamento por condição
  getPaymentMethodsForCondition(type: 'por_temporada' | 'por_etapa'): PaymentMethod[] {
    const condition = this.getPaymentCondition(type);
    return condition?.paymentMethods || [];
  }

  getPixInstallmentsForCondition(type: 'por_temporada' | 'por_etapa'): number {
    const condition = this.getPaymentCondition(type);
    return condition?.pixInstallments || 1;
  }

  getCreditCardInstallmentsForCondition(type: 'por_temporada' | 'por_etapa'): number {
    const condition = this.getPaymentCondition(type);
    return condition?.creditCardInstallments || 1;
  }
} 