import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';

@Entity('CreditCardFees')
@Index(['championshipId'])
@Index(['isActive'])
export class CreditCardFees extends BaseEntity {
  @Column({ nullable: false })
  championshipId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: "Range de parcelas (ex: '1', '2-6', '7-12', '13-21')",
  })
  installmentRange: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    comment: 'Taxa percentual (ex: 1.99, 2.49, 2.99, 3.29)',
  })
  percentageRate: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.49,
    comment: 'Taxa fixa por transação',
  })
  fixedFee: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Descrição da faixa de parcelas',
  })
  description: string;

  // Relacionamentos
  @ManyToOne(() => Championship, { eager: true })
  @JoinColumn({ name: 'championshipId' })
  championship: Championship;
}
