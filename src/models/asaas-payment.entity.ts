import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SeasonRegistration } from './season-registration.entity';

export enum AsaasBillingType {
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX'
}

export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  RECEIVED_IN_CASH = 'RECEIVED_IN_CASH',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_IN_PROGRESS = 'REFUND_IN_PROGRESS',
  CHARGEBACK_REQUESTED = 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE = 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL = 'AWAITING_CHARGEBACK_REVERSAL',
  DUNNING_REQUESTED = 'DUNNING_REQUESTED',
  DUNNING_RECEIVED = 'DUNNING_RECEIVED',
  AWAITING_RISK_ANALYSIS = 'AWAITING_RISK_ANALYSIS'
}

@Entity('AsaasPayments')
@Index(['asaasPaymentId'], { unique: true })
export class AsaasPayment extends BaseEntity {
  @Column({ nullable: false })
  registrationId: string;

  @Column({ length: 100, nullable: false, unique: true })
  asaasPaymentId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  asaasInstallmentId: string | null;

  @Column({ length: 100, nullable: false })
  asaasCustomerId: string;

  @Column({ 
    type: 'enum', 
    enum: AsaasBillingType, 
    nullable: false 
  })
  billingType: AsaasBillingType;

  @Column({ 
    type: 'enum', 
    enum: AsaasPaymentStatus, 
    default: AsaasPaymentStatus.PENDING 
  })
  status: AsaasPaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  netValue: number;

  @Column({ type: 'varchar', length: 10, nullable: false })
  // Data de vencimento no formato YYYY-MM-DD (data local, não UTC)
  dueDate: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  invoiceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bankSlipUrl: string | null;

  @Column({ type: 'text', nullable: true })
  pixQrCode: string | null;

  @Column({ type: 'text', nullable: true })
  pixCopyPaste: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paymentDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clientPaymentDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: any;

  @Column({ type: 'jsonb', nullable: true })
  webhookData: any;

  // Relacionamento
  @ManyToOne(() => SeasonRegistration, (registration) => registration.payments)
  @JoinColumn({ name: 'registrationId' })
  registration: SeasonRegistration;
} 