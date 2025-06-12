import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { SeasonRegistration, RegistrationStatus, PaymentStatus } from '../models/season-registration.entity';
import { AsaasPayment, AsaasPaymentStatus } from '../models/asaas-payment.entity';
import { User } from '../models/user.entity';
import { Season } from '../models/season.entity';
import { AsaasService, AsaasCustomer, AsaasPayment as AsaasPaymentData } from './asaas.service';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

export interface CreateRegistrationData {
  userId: string;
  seasonId: string;
  paymentMethod: 'boleto' | 'pix' | 'cartao_credito' | 'cartao_debito';
  userDocument?: string; // CPF do usuário para o Asaas
}

export interface RegistrationPaymentData {
  registrationId: string;
  billingType: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
}

export class SeasonRegistrationService {
  private registrationRepository: Repository<SeasonRegistration>;
  private paymentRepository: Repository<AsaasPayment>;
  private userRepository: Repository<User>;
  private seasonRepository: Repository<Season>;
  private asaasService: AsaasService;

  constructor() {
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.paymentRepository = AppDataSource.getRepository(AsaasPayment);
    this.userRepository = AppDataSource.getRepository(User);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.asaasService = new AsaasService();
  }

  /**
   * Cria uma nova inscrição na temporada com cobrança no Asaas
   */
  async createRegistration(data: CreateRegistrationData): Promise<{
    registration: SeasonRegistration;
    paymentData: RegistrationPaymentData;
  }> {
    // Validar se o usuário existe
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar se a temporada existe
    const season = await this.seasonRepository.findOne({ where: { id: data.seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Verificar se já existe uma inscrição para este usuário nesta temporada
    const existingRegistration = await this.registrationRepository.findOne({
      where: { userId: data.userId, seasonId: data.seasonId }
    });

    if (existingRegistration) {
      throw new BadRequestException('Usuário já está inscrito nesta temporada');
    }

    // Verificar se a temporada aceita o método de pagamento solicitado
    const asaasBillingType = this.asaasService.mapPaymentMethodToAsaas(data.paymentMethod);
    const seasonPaymentMethods = season.paymentMethods.map(pm => this.asaasService.mapPaymentMethodToAsaas(pm));
    
    if (!seasonPaymentMethods.includes(asaasBillingType)) {
      throw new BadRequestException(`Método de pagamento ${data.paymentMethod} não aceito para esta temporada`);
    }

    // Criar a inscrição no banco
    const registration = this.registrationRepository.create({
      userId: data.userId,
      seasonId: data.seasonId,
      amount: season.inscriptionValue,
      status: RegistrationStatus.PAYMENT_PENDING,
      paymentStatus: PaymentStatus.PENDING
    });

    const savedRegistration = await this.registrationRepository.save(registration);

    try {
      // Criar ou atualizar cliente no Asaas
      const asaasCustomerData: AsaasCustomer = {
        name: user.name,
        email: user.email,
        cpfCnpj: data.userDocument || user.email.replace('@', '_'), // Fallback se não tiver CPF
        notificationDisabled: false
      };

      const asaasCustomer = await this.asaasService.createOrUpdateCustomer(asaasCustomerData);

      // Calcular data de vencimento (7 dias a partir de hoje)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Criar cobrança no Asaas
      const asaasPaymentData: AsaasPaymentData = {
        customer: asaasCustomer.id!,
        billingType: asaasBillingType,
        value: Number(season.inscriptionValue),
        dueDate: this.asaasService.formatDateForAsaas(dueDate),
        description: `Inscrição na temporada: ${season.name}`,
        externalReference: savedRegistration.id,
      };

      const asaasPaymentResponse = await this.asaasService.createPayment(asaasPaymentData);

      // Salvar dados do pagamento no banco
      const asaasPayment = new AsaasPayment();
      asaasPayment.registrationId = savedRegistration.id;
      asaasPayment.asaasPaymentId = asaasPaymentResponse.id;
      asaasPayment.asaasCustomerId = asaasCustomer.id!;
             asaasPayment.billingType = asaasBillingType as any;
      asaasPayment.status = AsaasPaymentStatus.PENDING;
      asaasPayment.value = Number(season.inscriptionValue);
      asaasPayment.netValue = asaasPaymentResponse.netValue;
      asaasPayment.dueDate = new Date(asaasPaymentResponse.dueDate);
             asaasPayment.description = asaasPaymentResponse.description || null;
       asaasPayment.invoiceUrl = asaasPaymentResponse.invoiceUrl || null;
       asaasPayment.bankSlipUrl = asaasPaymentResponse.bankSlipUrl || null;
      asaasPayment.rawResponse = asaasPaymentResponse;

      // Se for PIX, buscar QR Code
      if (asaasBillingType === 'PIX') {
        try {
          const pixQrCode = await this.asaasService.getPixQrCode(asaasPaymentResponse.id);
          asaasPayment.pixQrCode = pixQrCode.encodedImage;
          asaasPayment.pixCopyPaste = pixQrCode.payload;
        } catch (error) {
          console.warn('Erro ao buscar QR Code PIX:', error);
        }
      }

      await this.paymentRepository.save(asaasPayment);

      // Preparar dados de retorno
      const paymentData: RegistrationPaymentData = {
        registrationId: savedRegistration.id,
        billingType: asaasBillingType,
        value: Number(season.inscriptionValue),
        dueDate: this.asaasService.formatDateForAsaas(dueDate),
        invoiceUrl: asaasPaymentResponse.invoiceUrl,
        bankSlipUrl: asaasPaymentResponse.bankSlipUrl,
        pixQrCode: asaasPayment.pixQrCode || undefined,
        pixCopyPaste: asaasPayment.pixCopyPaste || undefined
      };

      return {
        registration: savedRegistration,
        paymentData
      };

    } catch (error) {
      // Se houve erro na criação do pagamento, remover a inscrição
      await this.registrationRepository.remove(savedRegistration);
      throw error;
    }
  }

  /**
   * Busca uma inscrição por ID
   */
  async findById(id: string): Promise<SeasonRegistration | null> {
    return await this.registrationRepository.findOne({
      where: { id },
      relations: ['user', 'season']
    });
  }

  /**
   * Lista inscrições de um usuário
   */
  async findByUserId(userId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { userId },
      relations: ['season'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Lista inscrições de uma temporada
   */
  async findBySeasonId(seasonId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { seasonId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Processa webhook do Asaas para atualizar status de pagamento
   */
  async processAsaasWebhook(webhookData: any): Promise<void> {
    const { event, payment } = webhookData;
    
    if (!payment || !payment.id) {
      throw new BadRequestException('Dados de pagamento inválidos no webhook');
    }

    // Buscar o pagamento no banco
    const asaasPayment = await this.paymentRepository.findOne({
      where: { asaasPaymentId: payment.id },
      relations: ['registration']
    });

    if (!asaasPayment) {
      console.warn(`Pagamento ${payment.id} não encontrado no banco`);
      return;
    }

    // Atualizar dados do webhook
    asaasPayment.webhookData = webhookData;
    asaasPayment.status = payment.status;

    if (payment.paymentDate) {
      asaasPayment.paymentDate = new Date(payment.paymentDate);
    }

    if (payment.clientPaymentDate) {
      asaasPayment.clientPaymentDate = new Date(payment.clientPaymentDate);
    }

    // Atualizar status da inscrição baseado no evento
    const registration = asaasPayment.registration;

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        registration.paymentStatus = PaymentStatus.PAID;
        registration.status = RegistrationStatus.CONFIRMED;
        registration.paymentDate = new Date(payment.paymentDate || payment.clientPaymentDate);
        registration.confirmedAt = new Date();
        break;

      case 'PAYMENT_OVERDUE':
        registration.paymentStatus = PaymentStatus.FAILED;
        registration.status = RegistrationStatus.EXPIRED;
        break;

      case 'PAYMENT_DELETED':
        registration.paymentStatus = PaymentStatus.CANCELLED;
        registration.status = RegistrationStatus.CANCELLED;
        registration.cancelledAt = new Date();
        registration.cancellationReason = 'Pagamento cancelado via Asaas';
        break;

      case 'PAYMENT_REFUNDED':
        registration.paymentStatus = PaymentStatus.REFUNDED;
        registration.status = RegistrationStatus.CANCELLED;
        registration.cancelledAt = new Date();
        registration.cancellationReason = 'Pagamento estornado';
        break;

      default:
        console.log(`Evento não tratado: ${event}`);
    }

    // Salvar alterações
    await this.paymentRepository.save(asaasPayment);
    await this.registrationRepository.save(registration);

    console.log(`Processado webhook para pagamento ${payment.id}, evento: ${event}, status: ${payment.status}`);
  }

  /**
   * Cancela uma inscrição
   */
  async cancelRegistration(registrationId: string, reason: string): Promise<SeasonRegistration> {
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    // Verificar se a inscrição pode ser cancelada
    if (registration.status === RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('Não é possível cancelar uma inscrição já confirmada');
    }

    // Buscar pagamento associado
    const asaasPayment = await this.paymentRepository.findOne({
      where: { registrationId }
    });

    // Se existe pagamento pendente, tentar cancelar no Asaas
    if (asaasPayment && asaasPayment.status === AsaasPaymentStatus.PENDING) {
      try {
        await this.asaasService.cancelPayment(asaasPayment.asaasPaymentId);
        asaasPayment.status = AsaasPaymentStatus.PENDING; // Status será atualizado via webhook
        await this.paymentRepository.save(asaasPayment);
      } catch (error) {
        console.warn('Erro ao cancelar pagamento no Asaas:', error);
      }
    }

    // Atualizar inscrição
    registration.status = RegistrationStatus.CANCELLED;
    registration.paymentStatus = PaymentStatus.CANCELLED;
    registration.cancelledAt = new Date();
    registration.cancellationReason = reason;

    return await this.registrationRepository.save(registration);
  }

  /**
   * Busca dados de pagamento de uma inscrição
   */
  async getPaymentData(registrationId: string): Promise<RegistrationPaymentData | null> {
    const asaasPayment = await this.paymentRepository.findOne({
      where: { registrationId },
      relations: ['registration']
    });

    if (!asaasPayment) {
      return null;
    }

    // Converter dueDate para string se necessário
    const dueDateString = asaasPayment.dueDate instanceof Date ? 
      this.asaasService.formatDateForAsaas(asaasPayment.dueDate) : 
      String(asaasPayment.dueDate);

    return {
      registrationId,
      billingType: asaasPayment.billingType,
      value: Number(asaasPayment.value),
      dueDate: dueDateString,
      invoiceUrl: asaasPayment.invoiceUrl || undefined,
      bankSlipUrl: asaasPayment.bankSlipUrl || undefined,
      pixQrCode: asaasPayment.pixQrCode || undefined,
      pixCopyPaste: asaasPayment.pixCopyPaste || undefined
    };
  }
} 