import { Entity, Column, ManyToOne, JoinColumn, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';
import { Category } from './category.entity';
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

  // Parcelamento por método de pagamento
  @Column({ type: 'int', default: 1 })
  pixInstallments: number;

  @Column({ type: 'int', default: 1 })
  creditCardInstallments: number;



  // Relacionamento com o campeonato
  @Column({ nullable: false })
  championshipId: string;

  @ManyToOne(() => Championship, (championship) => championship.seasons)
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;

  @OneToMany(() => Category, (category) => category.season)
  categories: Category[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.name) {
      this.slug = slugify(this.name);
    }
  }
} 