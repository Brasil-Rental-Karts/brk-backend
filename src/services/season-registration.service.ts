import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { SeasonRegistration, RegistrationStatus, PaymentStatus } from '../models/season-registration.entity';
import { AsaasPayment, AsaasPaymentStatus } from '../models/asaas-payment.entity';
import { User } from '../models/user.entity';
import { Season } from '../models/season.entity';
import { Championship } from '../models/championship.entity';
import { Category } from '../models/category.entity';
import { SeasonRegistrationCategory } from '../models/season-registration-category.entity';
import { AsaasService, AsaasCustomer, AsaasPayment as AsaasPaymentData } from './asaas.service';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { removeDocumentMask } from '../utils/document.util';

export interface CreateRegistrationData {
  userId: string;
  seasonId: string;
  categoryIds: string[]; // Array de IDs das categorias selecionadas
  paymentMethod: 'pix' | 'cartao_credito';
  userDocument: string; // CPF/CNPJ do usuário (obrigatório)
  installments?: number;
}

export interface RegistrationPaymentData {
  id: string; // AsaasPayment ID
  registrationId: string;
  billingType: string;
  value: number;
  dueDate: string;
  status: string;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  paymentLink?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
}

export class SeasonRegistrationService {
  private registrationRepository: Repository<SeasonRegistration>;
  private paymentRepository: Repository<AsaasPayment>;
  private userRepository: Repository<User>;
  private seasonRepository: Repository<Season>;
  private championshipRepository: Repository<Championship>;
  private categoryRepository: Repository<Category>;
  private registrationCategoryRepository: Repository<SeasonRegistrationCategory>;
  private asaasService: AsaasService;

  constructor() {
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.paymentRepository = AppDataSource.getRepository(AsaasPayment);
    this.userRepository = AppDataSource.getRepository(User);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.championshipRepository = AppDataSource.getRepository(Championship);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.registrationCategoryRepository = AppDataSource.getRepository(SeasonRegistrationCategory);
    this.asaasService = new AsaasService();
  }

  /**
   * Cria uma nova inscrição na temporada com cobrança no Asaas
   */
  async createRegistration(data: CreateRegistrationData): Promise<{
    registration: SeasonRegistration;
    paymentData: RegistrationPaymentData;
  }> {
    console.log('=== DADOS RECEBIDOS NO BACKEND ===');
    console.log('data:', data);
    console.log('data.installments:', data.installments);
    console.log('data.paymentMethod:', data.paymentMethod);
    
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

    // Verificar se as inscrições estão abertas para esta temporada
    if (!season.registrationOpen) {
      throw new BadRequestException('As inscrições para esta temporada não estão abertas');
    }

    // Validar se o CPF/CNPJ foi fornecido
    if (!data.userDocument || data.userDocument.trim() === '') {
      throw new BadRequestException('CPF/CNPJ é obrigatório para realizar a inscrição');
    }

    // Validar se o parcelamento é permitido e se o número de parcelas é válido
    if (data.installments && data.installments > 1) {
      let maxInstallments = 1;
      
      // Verificar o número máximo de parcelas baseado no método de pagamento
      switch (data.paymentMethod) {
        case 'pix':
          maxInstallments = season.pixInstallments;
          break;
        case 'cartao_credito':
          maxInstallments = season.creditCardInstallments;
          break;
      }
      
      if (data.installments > maxInstallments) {
        throw new BadRequestException(`O número máximo de parcelas para ${data.paymentMethod} nesta temporada é ${maxInstallments}.`);
      }
    }

    // Validar se as categorias existem e pertencem à temporada
    if (!data.categoryIds || data.categoryIds.length === 0) {
      throw new BadRequestException('Pelo menos uma categoria deve ser selecionada');
    }

    const categories = await this.categoryRepository.find({
      where: { 
        id: In(data.categoryIds),
        seasonId: data.seasonId
      }
    });

    if (categories.length !== data.categoryIds.length) {
      throw new BadRequestException('Uma ou mais categorias são inválidas ou não pertencem a esta temporada');
    }

    // Buscar o campeonato para verificar configurações de split payment
    const championship = await this.championshipRepository.findOne({ where: { id: season.championshipId } });
    if (!championship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    // Verificar se o split payment está configurado corretamente
    if (championship.splitEnabled && !championship.asaasWalletId) {
      throw new BadRequestException('Campeonato com split habilitado deve ter uma subconta Asaas configurada. Entre em contato com o organizador do campeonato.');
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

    // Calcular o valor total baseado na quantidade de categorias
    const totalAmount = Number(season.inscriptionValue) * categories.length;

    // Criar a inscrição no banco
    const registration = this.registrationRepository.create({
      userId: data.userId,
      seasonId: data.seasonId,
      amount: totalAmount,
      status: RegistrationStatus.PAYMENT_PENDING,
      paymentStatus: PaymentStatus.PENDING
    });

    const savedRegistration = await this.registrationRepository.save(registration);

    // Salvar as categorias selecionadas
    const registrationCategories = categories.map(category => 
      this.registrationCategoryRepository.create({
        registrationId: savedRegistration.id,
        categoryId: category.id
      })
    );
    
    await this.registrationCategoryRepository.save(registrationCategories);

    try {
      // Criar ou atualizar cliente no Asaas
      const asaasCustomerData: AsaasCustomer = {
        name: user.name,
        email: user.email,
        cpfCnpj: data.userDocument ? removeDocumentMask(data.userDocument) : user.email.replace('@', '_'),
        notificationDisabled: false
      };

      console.log('=== CRIANDO/ATUALIZANDO CLIENTE ASAAS ===');
      console.log('asaasCustomerData:', asaasCustomerData);

      const asaasCustomer = await this.asaasService.createOrUpdateCustomer(asaasCustomerData);
      
      console.log('=== CLIENTE ASAAS CRIADO/ATUALIZADO ===');
      console.log('asaasCustomer.id:', asaasCustomer.id);
      console.log('asaasCustomer:', asaasCustomer);
      
      if (!asaasCustomer.id) {
        throw new Error('Cliente Asaas não possui ID válido');
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const categoriesNames = categories.map(c => c.name).join(', ');
      const description = `Inscrição de ${user.name} na temporada: ${season.name} - Categorias: ${categoriesNames}`;

      const isInstallment = data.installments && data.installments > 1;

      let asaasPaymentResponse: any;

      if (isInstallment && asaasBillingType === 'PIX') {
        // --- PIX Parcelado: usar endpoint /installments (cria carnê) ---
        const installmentPayload: any = {
          customer: asaasCustomer.id!,
          billingType: asaasBillingType,
          totalValue: totalAmount,
          installmentCount: data.installments,
          dueDate: this.asaasService.formatDateForAsaas(dueDate),
          description: description,
          externalReference: savedRegistration.id,
        };

        if (championship.splitEnabled && championship.asaasWalletId) {
          const platformCommission = Number(championship.platformCommissionPercentage) || 10;
          const championshipPercentage = 100 - platformCommission;
          installmentPayload.split = [{
            walletId: championship.asaasWalletId,
            percentualValue: championshipPercentage,
          }];
        }

        console.log('=== PIX PARCELADO ===');
        console.log('Usando /installments - Parcelas:', data.installments, 'Total:', totalAmount);
        console.log('installmentPayload:', JSON.stringify(installmentPayload, null, 2));

        try {
          const installmentPlan = await this.asaasService.createInstallmentPlan(installmentPayload);
          console.log('=== INSTALLMENT PLAN RESPONSE ===');
          console.log('installmentPlan:', installmentPlan);
          
          if (!installmentPlan || !installmentPlan.id) {
            throw new Error('Plano de parcelamento não foi criado corretamente');
          }
          
          // Para PIX parcelado, o Asaas retorna o plano geral, não as parcelas individuais
          // As parcelas individuais chegam via webhook depois
          // Vamos criar um objeto de resposta compatível usando os dados do plano
          asaasPaymentResponse = {
            id: installmentPlan.id,
            status: 'PENDING', // Status inicial do plano
            value: installmentPlan.paymentValue, // Valor da primeira parcela
            netValue: installmentPlan.netValue / installmentPlan.installmentCount, // Valor líquido por parcela
            dueDate: `2025-06-27`, // Data de vencimento da primeira parcela
            description: installmentPlan.description,
            billingType: installmentPlan.billingType,
            installmentNumber: 1, // Primeira parcela
            invoiceUrl: null, // Será preenchido via webhook
            bankSlipUrl: null,
            paymentLink: null,
            externalReference: installmentPlan.externalReference || savedRegistration.id
          };
          
          console.log('=== PLANO DE PARCELAMENTO CRIADO ===');
          console.log('installmentPlan.id:', installmentPlan.id);
          console.log('installmentPlan.installmentCount:', installmentPlan.installmentCount);
          console.log('installmentPlan.paymentValue:', installmentPlan.paymentValue);
          console.log('asaasPaymentResponse criado:', asaasPaymentResponse);
        } catch (installmentError) {
          console.error('=== ERRO NO PIX PARCELADO ===');
          console.error('Erro:', installmentError);
          throw installmentError;
        }
        
      } else {
        // --- Pagamentos únicos OU Cartão parcelado: usar endpoint /payments ---
        const paymentPayload: any = {
          customer: asaasCustomer.id!,
          billingType: asaasBillingType,
          dueDate: this.asaasService.formatDateForAsaas(dueDate),
          description: description,
          externalReference: savedRegistration.id,
        };

        // Para cartão parcelado, usar installmentCount + totalValue
        // Para pagamentos únicos, usar value
        if (isInstallment && asaasBillingType === 'CREDIT_CARD') {
          paymentPayload.installmentCount = data.installments;
          paymentPayload.totalValue = totalAmount;
          console.log('=== CARTÃO PARCELADO ===');
          console.log('Usando /payments - Parcelas:', data.installments, 'Total:', totalAmount);
        } else {
          paymentPayload.value = totalAmount;
          console.log('=== PAGAMENTO ÚNICO ===');
          console.log('Usando /payments - Valor:', totalAmount);
        }

        if (asaasBillingType === 'CREDIT_CARD') {
          // Usar ngrok URL se disponível, senão usar frontend URL
          let callbackUrl: string;
          
          if (process.env.ASAAS_WEBHOOK_URL && process.env.ASAAS_WEBHOOK_URL.includes('ngrok')) {
            // Usar ngrok URL apontando para o backend callback endpoint
            const ngrokBaseUrl = process.env.ASAAS_WEBHOOK_URL.split('/webhooks')[0];
            callbackUrl = `${ngrokBaseUrl}/season-registrations/${savedRegistration.id}/payment-callback`;
            console.log('=== USANDO NGROK PARA CALLBACK ===');
            console.log('ngrokBaseUrl:', ngrokBaseUrl);
          } else {
            // Fallback para localhost backend
            callbackUrl = `http://localhost:3000/season-registrations/${savedRegistration.id}/payment-callback`;
            console.log('=== USANDO LOCALHOST BACKEND PARA CALLBACK ===');
          }
          
          console.log('callbackUrl final:', callbackUrl);
          
          paymentPayload.callback = {
            successUrl: callbackUrl,
            autoRedirect: true
          };
        }

        if (championship.splitEnabled && championship.asaasWalletId) {
          const platformCommission = Number(championship.platformCommissionPercentage) || 10;
          const championshipPercentage = 100 - platformCommission;
          paymentPayload.split = [{
            walletId: championship.asaasWalletId,
            percentualValue: championshipPercentage,
          }];
        }

        asaasPaymentResponse = await this.asaasService.createPayment(paymentPayload);
      }

        const asaasPayment = new AsaasPayment();
        asaasPayment.registrationId = savedRegistration.id;
        asaasPayment.asaasPaymentId = asaasPaymentResponse.id;
        asaasPayment.asaasCustomerId = asaasCustomer.id!;
        asaasPayment.billingType = asaasBillingType as any;
        asaasPayment.status = asaasPaymentResponse.status as AsaasPaymentStatus;
        asaasPayment.value = asaasPaymentResponse.value; // Usar valor da resposta (parcela ou total)
        asaasPayment.netValue = asaasPaymentResponse.netValue;
        asaasPayment.dueDate = new Date(asaasPaymentResponse.dueDate);
        asaasPayment.description = asaasPaymentResponse.description || null;
        asaasPayment.invoiceUrl = asaasPaymentResponse.invoiceUrl || null;
        asaasPayment.bankSlipUrl = asaasPaymentResponse.bankSlipUrl || null;
        asaasPayment.rawResponse = asaasPaymentResponse;

        if (asaasBillingType === 'PIX') {
          try {
            const pixQrCode = await this.asaasService.getPixQrCode(asaasPaymentResponse.id);
            asaasPayment.pixQrCode = pixQrCode.encodedImage;
            asaasPayment.pixCopyPaste = pixQrCode.payload;
          } catch (error) {
            console.warn('Erro ao buscar QR Code PIX:', error);
          }
        }

        const savedAsaasPayment = await this.paymentRepository.save(asaasPayment);

        const paymentData: RegistrationPaymentData = {
          id: savedAsaasPayment.id,
          registrationId: savedRegistration.id,
          billingType: asaasBillingType,
          value: asaasPaymentResponse.value, // Usar o valor da resposta (150 para PIX parcelado, totalAmount para outros)
          dueDate: this.asaasService.formatDateForAsaas(dueDate),
          status: asaasPaymentResponse.status,
          installmentNumber: asaasPaymentResponse.installmentNumber,
          installmentCount: isInstallment ? data.installments : null,
          invoiceUrl: asaasPaymentResponse.invoiceUrl,
          bankSlipUrl: asaasPaymentResponse.bankSlipUrl,
          paymentLink: asaasPaymentResponse.paymentLink || (asaasBillingType === 'CREDIT_CARD' ? asaasPaymentResponse.invoiceUrl : null),
          pixQrCode: asaasPayment.pixQrCode || undefined,
          pixCopyPaste: asaasPayment.pixCopyPaste || undefined
        };

        console.log('=== PAYMENT DATA CRIADO ===');
        console.log('installmentCount:', paymentData.installmentCount);
        console.log('isInstallment:', isInstallment);
        console.log('data.installments:', data.installments);
        console.log('billingType:', asaasBillingType);

        return {
          registration: savedRegistration,
          paymentData
        };

    } catch (error) {
      // Se houve erro na criação do pagamento, remover a inscrição
      await this.registrationCategoryRepository.delete({ registrationId: savedRegistration.id });
      await this.registrationRepository.delete(savedRegistration.id);
      throw error;
    }
  }

  /**
   * Verifica se um campeonato tem configuração de split válida
   */
  async validateChampionshipSplitConfiguration(championshipId: string): Promise<{
    isValid: boolean;
    errors: string[];
    championship?: Championship;
  }> {
    const championship = await this.championshipRepository.findOne({ where: { id: championshipId } });
    
    if (!championship) {
      return {
        isValid: false,
        errors: ['Campeonato não encontrado']
      };
    }

    const errors: string[] = [];

    if (championship.splitEnabled) {
      if (!championship.asaasCustomerId) {
        errors.push('Subconta Asaas não configurada (asaasCustomerId ausente)');
      }
      
      if (!championship.asaasWalletId) {
        errors.push('Wallet ID não configurado (asaasWalletId ausente)');
      }
      
      if (!championship.document) {
        errors.push('Documento (CPF/CNPJ) não informado');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      championship
    };
  }

  /**
   * Busca uma inscrição por ID
   */
  async findById(id: string): Promise<SeasonRegistration | null> {
    return await this.registrationRepository.findOne({
      where: { id },
      relations: ['user', 'season', 'categories', 'categories.category']
    });
  }

  /**
   * Lista inscrições de um usuário
   */
  async findByUserId(userId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { userId },
      relations: ['season', 'categories', 'categories.category'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Lista inscrições de uma temporada
   */
  async findBySeasonId(seasonId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { seasonId },
      relations: ['user', 'categories', 'categories.category'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Lista todas as inscrições de um campeonato (busca por todas as temporadas do campeonato)
   */
  async findByChampionshipId(championshipId: string): Promise<SeasonRegistration[]> {
    const seasons = await this.seasonRepository.find({ where: { championshipId }, select: ['id'] });
    if (!seasons.length) {
      return [];
    }

    const seasonIds = seasons.map(s => s.id);
    return await this.registrationRepository.find({
      where: { seasonId: In(seasonIds) },
      relations: ['user', 'season', 'categories', 'categories.category', 'payments'],
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

    await this.registrationRepository.save(registration);
    return registration;
  }

  /**
   * Busca dados de pagamento de uma inscrição
   */
  async getPaymentData(registrationId: string): Promise<RegistrationPaymentData[] | null> {
    const payments = await this.paymentRepository.find({ 
      where: { registrationId },
      order: { dueDate: 'ASC' } 
    });

    if (!payments || payments.length === 0) {
      return null;
    }

    return payments.map(p => {
      // Garantir que dueDate seja um objeto Date válido
      let formattedDueDate: string;
      try {
        const dueDate = p.dueDate instanceof Date ? p.dueDate : new Date(p.dueDate);
        formattedDueDate = this.asaasService.formatDateForAsaas(dueDate);
      } catch (error) {
        console.error('Erro ao formatar dueDate:', error, 'Valor original:', p.dueDate);
        // Fallback: usar a data como string se não conseguir converter
        formattedDueDate = typeof p.dueDate === 'string' ? p.dueDate : new Date().toISOString().split('T')[0];
      }

      return {
        id: p.id,
        registrationId: p.registrationId,
        billingType: p.billingType,
        value: p.value,
        dueDate: formattedDueDate,
        status: p.status,
        installmentNumber: (p.rawResponse as any)?.installmentNumber,
        installmentCount: (p.rawResponse as any)?.installmentCount || null,
        invoiceUrl: p.invoiceUrl,
        bankSlipUrl: p.bankSlipUrl,
        paymentLink: (p.rawResponse as any)?.paymentLink || p.invoiceUrl,
        pixQrCode: p.pixQrCode,
        pixCopyPaste: p.pixCopyPaste,
      };
    });
  }
} 