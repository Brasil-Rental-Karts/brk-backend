import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum PersonType {
  FISICA = 0,
  JURIDICA = 1
}

@Entity('Championships')
export class Championship extends BaseEntity {
  // Sobre o Campeonato
  @Column({ length: 90, nullable: false })
  name: string;

  @Column({ length: 165, nullable: true })
  shortDescription: string;

  @Column({ type: 'text', nullable: true })
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

  @Column({ default: true })
  isResponsible: boolean;

  @Column({ length: 100, nullable: true })
  responsibleName: string;

  @Column({ length: 15, nullable: true })
  responsiblePhone: string;

  // Relacionamento com o usuário criador
  @Column({ nullable: false })
  ownerId: string;
} 