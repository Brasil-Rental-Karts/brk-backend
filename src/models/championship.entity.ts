import { Entity, Column, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { slugify } from '../utils/slugify';
import { Season } from './season.entity';

export enum PersonType {
  FISICA = 0,
  JURIDICA = 1
}

export interface Sponsor {
  id: string;
  name: string;
  logoImage: string;
  website?: string;
}

@Entity('Championships')
export class Championship extends BaseEntity {
  // Sobre o Campeonato
  @Column({ length: 90, nullable: false })
  name: string;

  @Column({ length: 100, nullable: true, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: false })
  championshipImage: string;

  @Column({ length: 165, nullable: false })
  shortDescription: string;

  @Column({ type: 'text', nullable: false })
  fullDescription: string;

  // Dados Gerais
  @Column({ 
    type: 'enum', 
    enum: PersonType, 
    default: PersonType.FISICA 
  })
  personType: PersonType;

  @Column({ length: 18, nullable: false })
  document: string;

  @Column({ length: 255, nullable: true })
  socialReason: string;

  @Column({ length: 9, nullable: false })
  cep: string;

  @Column({ length: 2, nullable: false })
  state: string;

  @Column({ length: 100, nullable: false })
  city: string;

  @Column({ type: 'text', nullable: false })
  fullAddress: string;

  @Column({ length: 10, nullable: false })
  number: string;

  @Column({ length: 100, nullable: true })
  complement: string;

  @Column({ length: 100, nullable: false })
  province: string;

  @Column({ default: true })
  isResponsible: boolean;

  @Column({ length: 100, nullable: true })
  responsibleName: string;

  @Column({ length: 15, nullable: false })
  responsiblePhone: string;

  @Column({ length: 100, nullable: false })
  responsibleEmail: string;

  @Column({ type: 'date', nullable: false })
  responsibleBirthDate: Date;

  @Column({ 
    type: 'enum', 
    enum: ['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'], 
    nullable: true 
  })
  companyType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  incomeValue: number;

  // Patrocinadores
  @Column({ type: 'jsonb', nullable: true, default: [] })
  sponsors: Sponsor[];

  // Dados do Asaas para Split Payment
  @Column({ length: 255, nullable: true })
  asaasWalletId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  platformCommissionPercentage: number;

  @Column({ default: true })
  splitEnabled: boolean;

  // Relacionamento com o usuário criador
  @Column({ nullable: false })
  ownerId: string;

  @OneToMany(() => Season, (season) => season.championship)
  seasons: Season[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    this.slug = slugify(this.name);
  }
} 