import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Season } from './season.entity';
import { SeasonRegistrationCategory } from './season-registration-category.entity';
import { AsaasPayment } from './asaas-payment.entity';

export enum RegistrationStatus {
  PENDING = 'pending',
  PAYMENT_PENDING = 'payment_pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

@Entity('SeasonRegistrations')
@Index(['userId', 'seasonId'], { unique: true })
export class SeasonRegistration extends BaseEntity {
  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  seasonId: string;

  @Column({ 
    type: 'enum', 
    enum: RegistrationStatus, 
    default: RegistrationStatus.PENDING 
  })
  status: RegistrationStatus;

  @Column({ 
    type: 'enum', 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING 
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'timestamptz', nullable: true })
  paymentDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ length: 255, nullable: true })
  cancellationReason: string;

  // Relacionamentos
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Season, { eager: true })
  @JoinColumn({ name: 'seasonId' })
  season: Season;

  @OneToMany(() => SeasonRegistrationCategory, regCategory => regCategory.registration)
  categories: SeasonRegistrationCategory[];

  @OneToMany(() => AsaasPayment, payment => payment.registration)
  payments: AsaasPayment[];
} 