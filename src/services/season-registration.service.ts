import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { SeasonRegistration, RegistrationStatus, PaymentStatus } from '../models/season-registration.entity';
import { AsaasPayment, AsaasPaymentStatus, AsaasBillingType } from '../models/asaas-payment.entity';
import { User } from '../models/user.entity';
import { Season } from '../models/season.entity';
import { Championship } from '../models/championship.entity';
import { Category } from '../models/category.entity';
import { Stage } from '../models/stage.entity';
import { SeasonRegistrationCategory } from '../models/season-registration-category.entity';
import { SeasonRegistrationStage } from '../models/season-registration-stage.entity';
import { AsaasService, AsaasCustomer, AsaasPayment as AsaasPaymentData } from './asaas.service';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { removeDocumentMask } from '../utils/document.util';
import { isValidDocumentLength } from '../utils/document.util';

export interface CreateRegistrationData {
  userId: string;
  seasonId: string;
  categoryIds: string[]; // Array de IDs das categorias selecionadas
  stageIds?: string[]; // Array de IDs das etapas selecionadas (opcional)
  paymentMethod: 'pix' | 'cartao_credito';
  userDocument: string; // CPF/CNPJ do usuário (obrigatório)
  installments?: number;
  totalAmount?: number; // Valor total calculado incluindo taxas
}

export interface CreateAdminRegistrationData {
  userId: string;
  seasonId: string;
  categoryIds: string[];
  stageIds?: string[];
  paymentStatus: 'exempt' | 'direct_payment';
  amount: number;
  notes?: string;
}

export interface AddStagesToRegistrationData {
  stageIds: string[];
  paymentStatus: 'exempt' | 'direct_payment';
  amount: number;
  notes?: string;
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
  private stageRepository: Repository<Stage>;
  private registrationCategoryRepository: Repository<SeasonRegistrationCategory>;
  private registrationStageRepository: Repository<SeasonRegistrationStage>;
  private asaasService: AsaasService;

  constructor() {
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.paymentRepository = AppDataSource.getRepository(AsaasPayment);
    this.userRepository = AppDataSource.getRepository(User);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.championshipRepository = AppDataSource.getRepository(Championship);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.registrationCategoryRepository = AppDataSource.getRepository(SeasonRegistrationCategory);
    this.registrationStageRepository = AppDataSource.getRepository(SeasonRegistrationStage);
    this.asaasService = new AsaasService();
  }

  /**
   * Calcula o percentual correto para o split no Asaas
   * Quando queremos que X% fiquem com a plataforma, o percentual para o split é: X / (1 + X/100)
   * Exemplo: Para 10% ficarem com a plataforma: 10 / (1 + 10/100) = 10 / 1.1 = 9.09%
   */
  private calculateSplitPercentage(platformCommissionPercentage: number): number {
    const commission = platformCommissionPercentage / 100;
    const splitPercentage = (commission / (1 + commission)) * 100;
    return Math.round(splitPercentage * 100) / 100; // Arredondar para 2 casas decimais
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
    if (championship.splitEnabled && championship.commissionAbsorbedByChampionship && !championship.asaasWalletId) {
      throw new BadRequestException('Campeonato com split habilitado deve ter um Wallet ID configurado. Entre em contato com o organizador do campeonato.');
    }

    // Verificar se já existe uma inscrição para este usuário nesta temporada
    const existingRegistration = await this.registrationRepository.findOne({
      where: { userId: data.userId, seasonId: data.seasonId },
      relations: ['stages', 'stages.stage']
    });

    // Para temporadas por temporada, não permitir inscrição duplicada
    if (season.inscriptionType === 'por_temporada' && existingRegistration) {
      throw new BadRequestException('Usuário já está inscrito nesta temporada');
    }

    // Para temporadas por etapa, verificar se as etapas já estão inscritas
    if (season.inscriptionType === 'por_etapa' && existingRegistration && data.stageIds && data.stageIds.length > 0) {
      const existingStageIds = existingRegistration.stages.map(stage => stage.stageId);
      const duplicateStageIds = data.stageIds.filter(stageId => existingStageIds.includes(stageId));
      
      if (duplicateStageIds.length > 0) {
        const duplicateStages = await this.stageRepository.find({
          where: { id: In(duplicateStageIds) }
        });
        const stageNames = duplicateStages.map(stage => stage.name).join(', ');
        throw new BadRequestException(`Você já está inscrito nas seguintes etapas: ${stageNames}`);
      }
    }

    // Verificar se a temporada aceita o método de pagamento solicitado
    const asaasBillingType = this.asaasService.mapPaymentMethodToAsaas(data.paymentMethod);
    const seasonPaymentMethods = season.paymentMethods.map(pm => this.asaasService.mapPaymentMethodToAsaas(pm));
    
    if (!seasonPaymentMethods.includes(asaasBillingType)) {
      throw new BadRequestException(`Método de pagamento ${data.paymentMethod} não aceito para esta temporada`);
    }

    // Buscar etapas se for inscrição por etapa
    let stages: Stage[] = [];
    
    if (season.inscriptionType === 'por_etapa' && data.stageIds && data.stageIds.length > 0) {
      stages = await this.stageRepository.find({
        where: { 
          id: In(data.stageIds),
          seasonId: data.seasonId
        }
      });

      if (stages.length !== data.stageIds.length) {
        throw new BadRequestException('Uma ou mais etapas são inválidas ou não pertencem a esta temporada');
      }
    }

    // Calcular o valor total baseado no tipo de inscrição
    let totalAmount: number;
    
    // Debug log para verificar os dados recebidos
    console.log('[BACKEND] Dados recebidos do frontend:', {
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      installments: data.installments,
      categoryIds: data.categoryIds,
      stageIds: data.stageIds
    });
    
    // Se o frontend forneceu o valor total (incluindo taxas), usar ele
    if (data.totalAmount && data.totalAmount > 0) {
      totalAmount = data.totalAmount;
      console.log('[BACKEND] Usando totalAmount fornecido pelo frontend:', totalAmount);
    } else {
      // Calcular automaticamente se não foi fornecido
      if (season.inscriptionType === 'por_etapa' && stages.length > 0) {
        // Por etapa: quantidade de categorias x quantidade de etapas x valor da inscrição
        totalAmount = Number(season.inscriptionValue) * categories.length * stages.length;
      } else {
        // Por temporada: quantidade de categorias x valor da inscrição
        totalAmount = Number(season.inscriptionValue) * categories.length;
      }

      // Aplicar comissão da plataforma se ela deve ser cobrada do piloto
      if (!championship.commissionAbsorbedByChampionship) {
        const platformCommission = Number(championship.platformCommissionPercentage) || 10;
        const commissionAmount = totalAmount * (platformCommission / 100);
        totalAmount += commissionAmount;
      }
    }

    let savedRegistration: SeasonRegistration;

    // Para temporadas por etapa, se já existe inscrição, atualizar ela
    if (season.inscriptionType === 'por_etapa' && existingRegistration) {
      // Atualizar o valor total (adicionar ao valor existente)
      const newTotalAmount = Number(existingRegistration.amount) + totalAmount;
      
      // Atualizar a inscrição existente
      existingRegistration.amount = newTotalAmount;
      existingRegistration.paymentMethod = data.paymentMethod;
      existingRegistration.status = RegistrationStatus.PAYMENT_PENDING;
      existingRegistration.paymentStatus = PaymentStatus.PENDING;
      
      savedRegistration = await this.registrationRepository.save(existingRegistration);
    } else {
      // Criar nova inscrição
      console.log('[BACKEND] Salvando inscrição com amount:', totalAmount);
      const registration = this.registrationRepository.create({
        userId: data.userId,
        seasonId: data.seasonId,
        amount: totalAmount,
        paymentMethod: data.paymentMethod,
        status: RegistrationStatus.PAYMENT_PENDING,
        paymentStatus: PaymentStatus.PENDING
      });

      savedRegistration = await this.registrationRepository.save(registration);
    }

    // Para inscrições novas, salvar as categorias selecionadas
    if (!existingRegistration || season.inscriptionType === 'por_temporada') {
      const registrationCategories = categories.map(category => 
        this.registrationCategoryRepository.create({
          registrationId: savedRegistration.id,
          categoryId: category.id
        })
      );
      
      await this.registrationCategoryRepository.save(registrationCategories);
    }

    // Salvar as etapas selecionadas (se for inscrição por etapa)
    
    if (season.inscriptionType === 'por_etapa' && stages.length > 0) {
      const registrationStages = stages.map(stage => 
        this.registrationStageRepository.create({
          registrationId: savedRegistration.id,
          stageId: stage.id
        })
      );
      
      await this.registrationStageRepository.save(registrationStages);
    }

    try {
      // Criar ou atualizar cliente no Asaas
      const asaasCustomerData: AsaasCustomer = {
        name: user.name,
        email: user.email,
        cpfCnpj: data.userDocument ? removeDocumentMask(data.userDocument) : '',
        notificationDisabled: false
      };

      // Validar se temos um CPF/CNPJ válido
      if (!asaasCustomerData.cpfCnpj || !isValidDocumentLength(asaasCustomerData.cpfCnpj)) {
        throw new BadRequestException('CPF/CNPJ é obrigatório e deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).');
      }

      const asaasCustomer = await this.asaasService.createOrUpdateCustomer(asaasCustomerData);
      
      if (!asaasCustomer.id) {
        throw new Error('Cliente Asaas não possui ID válido');
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 dias de vencimento para PIX
      
      // Garantir que o vencimento seja exatamente 7 dias, considerando timezone
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      // Definir o horário para 23:59:59 para garantir que seja o último momento do dia
      sevenDaysFromNow.setHours(23, 59, 59, 999);
      
      const categoriesNames = categories.map(c => c.name).join(', ');
      const description = `Inscrição de ${user.name} na temporada: ${season.name} - Categorias: ${categoriesNames}`;

      const isInstallment = data.installments && data.installments > 1;

      let asaasPaymentResponse: any;

      if (isInstallment && asaasBillingType === 'PIX') {
        // --- PIX Parcelado: usar endpoint /installments (cria parcelamento) ---
        const installmentPayload: any = {
          customer: asaasCustomer.id!,
          billingType: asaasBillingType,
          totalValue: totalAmount,
          installmentCount: data.installments,
          dueDate: this.asaasService.formatDateForAsaas(sevenDaysFromNow),
          description: description,
          externalReference: savedRegistration.id,
        };

        if (championship.splitEnabled && championship.asaasWalletId) {
          const platformCommission = Number(championship.platformCommissionPercentage) || 10;
          const splitPercentage = this.calculateSplitPercentage(platformCommission);
          installmentPayload.split = [{
            walletId: championship.asaasWalletId,
            percentualValue: 100 - splitPercentage,
          }];
        }

        const installmentPlan = await this.asaasService.createInstallmentPlan(installmentPayload);
        
        if (!installmentPlan || !installmentPlan.id) {
          throw new Error('Plano de parcelamento não foi criado corretamente');
        }
        
        // Buscar as parcelas individuais criadas pelo plano
        const installmentPayments = await this.asaasService.getInstallmentPayments(installmentPlan.id);
        
        if (!installmentPayments || installmentPayments.length === 0) {
          // Fallback: usar dados do plano como primeira parcela
          asaasPaymentResponse = {
            id: installmentPlan.id,
            status: 'PENDING',
            value: installmentPlan.paymentValue,
            netValue: installmentPlan.netValue / installmentPlan.installmentCount,
            dueDate: `2025-06-27`,
            description: installmentPlan.description,
            billingType: installmentPlan.billingType,
            installmentNumber: 1,
            invoiceUrl: null,
            bankSlipUrl: null,
            paymentLink: null,
            externalReference: installmentPlan.externalReference || savedRegistration.id
          };
        } else {
          // Ordenar parcelas por installmentNumber antes de processar
          const sortedPayments = installmentPayments.sort((a, b) => {
            const aNum = a.installmentNumber || 999;
            const bNum = b.installmentNumber || 999;
            return aNum - bNum;
          });
          
          // Salvar TODAS as parcelas no banco de dados (já ordenadas)
          await this.saveAllInstallmentPayments(
            savedRegistration.id,
            installmentPlan.id,
            asaasCustomer.id!,
            sortedPayments
          );
          
          // Usar a primeira parcela (installmentNumber = 1)
          const firstPayment = sortedPayments[0];
          
          asaasPaymentResponse = {
            id: firstPayment.id,
            status: firstPayment.status,
            value: firstPayment.value,
            netValue: firstPayment.netValue,
            dueDate: firstPayment.dueDate,
            description: firstPayment.description,
            billingType: firstPayment.billingType,
            installmentNumber: firstPayment.installmentNumber,
            installmentCount: installmentPlan.installmentCount,
            invoiceUrl: firstPayment.invoiceUrl,
            bankSlipUrl: firstPayment.bankSlipUrl,
            paymentLink: firstPayment.paymentLink,
            externalReference: firstPayment.externalReference || savedRegistration.id
          };
        }
      } else {
        // --- Pagamento único ou cartão parcelado: usar endpoint /payments ---
        const paymentPayload: any = {
          customer: asaasCustomer.id!,
          billingType: asaasBillingType,
          dueDate: this.asaasService.formatDateForAsaas(sevenDaysFromNow),
          description: description,
          externalReference: savedRegistration.id,
        };

        // Para cartão parcelado, usar installmentCount + totalValue
        // Para pagamentos únicos, usar value
        if (isInstallment && asaasBillingType === 'CREDIT_CARD') {
          paymentPayload.installmentCount = data.installments;
          paymentPayload.totalValue = totalAmount;
        } else {
          paymentPayload.value = totalAmount;
        }

        if (asaasBillingType === 'CREDIT_CARD') {
          // Usar ngrok URL se disponível, senão usar frontend URL
          let callbackUrl: string;
          let successUrl: string;
          
          if (process.env.NGROK_URL) {
            callbackUrl = `${process.env.NGROK_URL}/api/asaas/webhook`;
            successUrl = `${process.env.NGROK_URL}/api/season-registrations/${savedRegistration.id}/payment-callback`;
          } else {
            callbackUrl = `${process.env.FRONTEND_URL}/api/asaas/webhook`;
            successUrl = `${process.env.BACKEND_URL || 'http://localhost:3000/api'}/season-registrations/${savedRegistration.id}/payment-callback`;
          }
          
          paymentPayload.callback = {
            url: callbackUrl,
            successUrl: successUrl,
            autoRedirect: true
          };
        }

        // Aplicar split para pagamentos únicos e cartão de crédito
        if (championship.splitEnabled && championship.asaasWalletId) {
          const platformCommission = Number(championship.platformCommissionPercentage) || 10;
          const splitPercentage = this.calculateSplitPercentage(platformCommission);
          paymentPayload.split = [{
            walletId: championship.asaasWalletId,
            percentualValue: 100 - splitPercentage,
          }];
        }

        asaasPaymentResponse = await this.asaasService.createPayment(paymentPayload);
      }

      // Para PIX parcelado, as parcelas já foram salvas pelo método saveAllInstallmentPayments
      // Não precisamos salvar novamente. Para outros tipos de pagamento, salvar normalmente.
      let savedAsaasPayment;
      
      if (isInstallment && asaasBillingType === 'PIX') {
        // Buscar a primeira parcela que já foi salva
        savedAsaasPayment = await this.paymentRepository.findOne({
          where: { 
            registrationId: savedRegistration.id,
            asaasPaymentId: asaasPaymentResponse.id 
          }
        });
        
        if (!savedAsaasPayment) {
          throw new Error('Erro: Primeira parcela não encontrada no banco após salvar installment payments');
        }
      } else {
        // Para pagamentos únicos ou cartão parcelado
        const asaasPayment = new AsaasPayment();
        asaasPayment.registrationId = savedRegistration.id;
        asaasPayment.asaasPaymentId = asaasPaymentResponse.id;
        asaasPayment.asaasCustomerId = asaasCustomer.id!;
        asaasPayment.billingType = asaasBillingType as any;
        asaasPayment.status = asaasPaymentResponse.status as AsaasPaymentStatus;
        asaasPayment.value = asaasPaymentResponse.value;
        asaasPayment.netValue = asaasPaymentResponse.netValue;
        asaasPayment.dueDate = asaasPaymentResponse.dueDate;
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

        savedAsaasPayment = await this.paymentRepository.save(asaasPayment);
        
        // Atualizar o status da inscrição após criar o pagamento
        await this.updateSeasonRegistrationStatus(savedRegistration.id);
      }

        const paymentData: RegistrationPaymentData = {
          id: savedAsaasPayment.id,
          registrationId: savedRegistration.id,
          billingType: asaasBillingType,
          value: asaasPaymentResponse.value, // Usar o valor da resposta (150 para PIX parcelado, totalAmount para outros)
          dueDate: this.asaasService.formatDateForAsaas(sevenDaysFromNow),
          status: asaasPaymentResponse.status,
          installmentNumber: asaasPaymentResponse.installmentNumber,
          installmentCount: isInstallment ? data.installments : null,
          invoiceUrl: asaasPaymentResponse.invoiceUrl,
          bankSlipUrl: asaasPaymentResponse.bankSlipUrl,
          paymentLink: asaasPaymentResponse.paymentLink || (asaasBillingType === 'CREDIT_CARD' ? asaasPaymentResponse.invoiceUrl : null),
          pixQrCode: savedAsaasPayment.pixQrCode || undefined,
          pixCopyPaste: savedAsaasPayment.pixCopyPaste || undefined
        };

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
   * Buscar inscrição por ID
   */
  async findById(id: string): Promise<SeasonRegistration | null> {
    const registration = await this.registrationRepository.findOne({
      where: { id },
      relations: ['user', 'season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage']
    });

    return registration;
  }

  /**
   * Lista inscrições de um usuário
   */
  async findByUserId(userId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { userId },
      relations: ['season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage', 'payments'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Lista inscrições de uma temporada
   */
  async findBySeasonId(seasonId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { seasonId },
      relations: ['user', 'season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage', 'payments'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Lista inscrições de um campeonato
   */
  async findByChampionshipId(championshipId: string): Promise<SeasonRegistration[]> {
    return await this.registrationRepository.find({
      where: { season: { championshipId } },
      relations: ['user', 'season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage', 'payments'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Conta pilotos inscritos por categoria (inclui todos os status exceto cancelados e expirados)
   */
  async countRegistrationsByCategory(categoryId: string): Promise<number> {
    const result = await this.registrationCategoryRepository
      .createQueryBuilder('regCategory')
      .innerJoin('regCategory.registration', 'registration')
      .where('regCategory.categoryId = :categoryId', { categoryId })
      .andWhere('registration.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: [RegistrationStatus.CANCELLED, RegistrationStatus.EXPIRED] 
      })
      .getCount();
    
    return result;
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
      console.log(`[WEBHOOK] Pagamento não encontrado no banco: ${payment.id}`);
      return;
    }

    console.log(`[WEBHOOK] Processando evento: ${event} para pagamento: ${payment.id}`);

    // Tratamento específico para PAYMENT_DELETED
    if (event === 'PAYMENT_DELETED') {
      console.log(`[WEBHOOK] Pagamento deletado no Asaas: ${payment.id}`);
      
      // Deletar o pagamento do banco de dados
      await this.paymentRepository.remove(asaasPayment);
      
      // Atualizar o status da inscrição
      await this.updateSeasonRegistrationStatus(asaasPayment.registrationId);
      
      console.log(`[WEBHOOK] Pagamento removido do banco e status da inscrição atualizado`);
      return;
    }

    // Para outros eventos, atualizar normalmente
    // Atualizar dados do webhook
    asaasPayment.webhookData = webhookData;
    asaasPayment.status = payment.status;

    if (payment.paymentDate) {
      asaasPayment.paymentDate = new Date(payment.paymentDate);
    }

    if (payment.clientPaymentDate) {
      asaasPayment.clientPaymentDate = new Date(payment.clientPaymentDate);
    }

    // Salvar as alterações do pagamento
    await this.paymentRepository.save(asaasPayment);

    // Atualizar o status da inscrição usando a nova lógica
    await this.updateSeasonRegistrationStatus(asaasPayment.registrationId);
  }

  /**
   * Cria uma inscrição administrativa (isento ou pagamento direto)
   */
  async createAdminRegistration(data: CreateAdminRegistrationData): Promise<SeasonRegistration> {
    // Verificar se o usuário existe
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se a temporada existe
    const season = await this.seasonRepository.findOne({ where: { id: data.seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Verificar se já existe uma inscrição para este usuário nesta temporada
    const existingRegistration = await this.registrationRepository.findOne({
      where: { userId: data.userId, seasonId: data.seasonId }
    });

    if (existingRegistration) {
      throw new BadRequestException('Usuário já possui inscrição nesta temporada');
    }

    // Verificar se as categorias existem
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categories = await this.categoryRepository.find({
        where: { id: In(data.categoryIds) }
      });
      
      if (categories.length !== data.categoryIds.length) {
        throw new BadRequestException('Uma ou mais categorias não foram encontradas');
      }
    }

    // Verificar se as etapas existem
    if (data.stageIds && data.stageIds.length > 0) {
      const stages = await this.stageRepository.find({
        where: { id: In(data.stageIds) }
      });
      
      if (stages.length !== data.stageIds.length) {
        throw new BadRequestException('Uma ou mais etapas não foram encontradas');
      }
    }

    // Criar a inscrição
    const registration = new SeasonRegistration();
    registration.userId = data.userId;
    registration.seasonId = data.seasonId;
    registration.amount = data.amount;
    registration.paymentStatus = data.paymentStatus as PaymentStatus;
    registration.status = data.paymentStatus === 'exempt' ? RegistrationStatus.CONFIRMED : RegistrationStatus.PAYMENT_PENDING;
    registration.paymentMethod = data.paymentStatus === 'exempt' ? 'admin_exempt' : 'admin_direct';
    
    // Definir datas baseadas no status
    if (data.paymentStatus === 'exempt') {
      registration.confirmedAt = new Date();
    }

    const savedRegistration = await this.registrationRepository.save(registration);

    // Criar registros de categorias
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categoryRegistrations = data.categoryIds.map(categoryId => {
        const categoryRegistration = new SeasonRegistrationCategory();
        categoryRegistration.registrationId = savedRegistration.id;
        categoryRegistration.categoryId = categoryId;
        return categoryRegistration;
      });

      await this.registrationCategoryRepository.save(categoryRegistrations);
    }

    // Criar registros de etapas
    if (data.stageIds && data.stageIds.length > 0) {
      const stageRegistrations = data.stageIds.map(stageId => {
        const stageRegistration = new SeasonRegistrationStage();
        stageRegistration.registrationId = savedRegistration.id;
        stageRegistration.stageId = stageId;
        return stageRegistration;
      });

      await this.registrationStageRepository.save(stageRegistrations);
    }

    // Buscar a inscrição completa com relacionamentos
    const completeRegistration = await this.registrationRepository.findOne({
      where: { id: savedRegistration.id },
      relations: ['user', 'season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage']
    });

    if (!completeRegistration) {
      throw new Error('Erro ao buscar inscrição criada');
    }

    return completeRegistration;
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
        
        // Atualizar o status da inscrição após cancelar o pagamento
        await this.updateSeasonRegistrationStatus(registrationId);
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
    // Remover categorias e etapas vinculadas
    await this.registrationCategoryRepository.delete({ registrationId });
    await this.registrationStageRepository.delete({ registrationId });
    return registration;
  }

  /**
   * Sincroniza manualmente o status de pagamentos de uma inscrição com o Asaas
   */
  async syncPaymentStatusFromAsaas(registrationId: string): Promise<RegistrationPaymentData[] | null> {
    // Buscar todos os pagamentos da inscrição no banco de dados
    const localPayments = await this.paymentRepository.find({ 
      where: { registrationId },
      order: { dueDate: 'ASC' } 
    });

    if (!localPayments || localPayments.length === 0) {
      return null;
    }

    // Verificar se é um PIX parcelado (installment plan)
    const firstPayment = localPayments[0];
    const isInstallmentPlan = firstPayment.asaasInstallmentId && firstPayment.billingType === 'PIX';
    
    if (isInstallmentPlan && firstPayment.asaasInstallmentId) {
      return await this.syncInstallmentPayments(registrationId, firstPayment.asaasInstallmentId);
    }

    // Para pagamentos únicos ou cartão, usar o método existente
    const updatedPayments: RegistrationPaymentData[] = [];
    
    for (const localPayment of localPayments) {
      try {
        // Buscar dados atualizados do Asaas
        const asaasPayment = await this.asaasService.getPayment(localPayment.asaasPaymentId);
        
        // Atualizar apenas se o status mudou
        if (asaasPayment.status !== localPayment.status) {
          localPayment.status = asaasPayment.status as AsaasPaymentStatus;
          localPayment.webhookData = { 
            lastSync: new Date().toISOString(),
            syncSource: 'manual',
            previousStatus: localPayment.status 
          };
          
          if (asaasPayment.paymentDate) {
            localPayment.paymentDate = new Date(asaasPayment.paymentDate);
          }
          
          if (asaasPayment.clientPaymentDate) {
            localPayment.clientPaymentDate = new Date(asaasPayment.clientPaymentDate);
          }
          
          // Atualizar outras informações que podem ter mudado
          if (asaasPayment.invoiceUrl) {
            localPayment.invoiceUrl = asaasPayment.invoiceUrl;
          }
          
          // Salvar as mudanças
          await this.paymentRepository.save(localPayment);
          
          // Atualizar o status da inscrição após atualizar o pagamento
          await this.updateSeasonRegistrationStatus(localPayment.registrationId);
          
          // Adicionar à lista de resultados
          const paymentData: RegistrationPaymentData = {
            id: localPayment.id,
            registrationId: localPayment.registrationId,
            billingType: localPayment.billingType,
            value: localPayment.value,
            dueDate: this.asaasService.formatDateForAsaas(localPayment.dueDate),
            status: localPayment.status,
            installmentNumber: asaasPayment.installmentNumber,
            installmentCount: (localPayment.rawResponse as any)?.installmentCount || null,
            invoiceUrl: localPayment.invoiceUrl,
            bankSlipUrl: localPayment.bankSlipUrl,
            paymentLink: asaasPayment.paymentLink || localPayment.invoiceUrl,
            pixQrCode: localPayment.pixQrCode,
            pixCopyPaste: localPayment.pixCopyPaste,
          };
          
          updatedPayments.push(paymentData);
          
        }
      } catch (error) {
        // Em caso de erro, retornar os dados locais
        const fallbackData: RegistrationPaymentData = {
          id: localPayment.id,
          registrationId: localPayment.registrationId,
          billingType: localPayment.billingType,
          value: localPayment.value,
          dueDate: this.asaasService.formatDateForAsaas(localPayment.dueDate),
          status: localPayment.status,
          installmentNumber: (localPayment.rawResponse as any)?.installmentNumber,
          installmentCount: (localPayment.rawResponse as any)?.installmentCount || null,
          invoiceUrl: localPayment.invoiceUrl,
          bankSlipUrl: localPayment.bankSlipUrl,
          paymentLink: (localPayment.rawResponse as any)?.paymentLink || localPayment.invoiceUrl,
          pixQrCode: localPayment.pixQrCode,
          pixCopyPaste: localPayment.pixCopyPaste,
        };
        
        updatedPayments.push(fallbackData);
      }
    }

    // Atualizar o status da inscrição após sincronizar todos os pagamentos
    await this.updateSeasonRegistrationStatus(registrationId);
    
    return updatedPayments;
  }

  /**
   * Sincroniza pagamentos de um plano de parcelamento PIX
   * Usa o endpoint correto: GET /installments/{installment_id}/payments
   */
  private async syncInstallmentPayments(registrationId: string, installmentId: string): Promise<RegistrationPaymentData[]> {
    try {
      // Buscar TODAS as parcelas do plano diretamente do Asaas via endpoint correto
      const asaasInstallmentPayments = await this.asaasService.getInstallmentPayments(installmentId);
      
      const updatedPayments: RegistrationPaymentData[] = [];
      
      // Para cada parcela do Asaas, verificar se existe no banco local
      for (const asaasPayment of asaasInstallmentPayments) {
        let localPayment = await this.paymentRepository.findOne({
          where: { asaasPaymentId: asaasPayment.id }
        });
        
        if (!localPayment) {
          // Parcela não existe no banco local - criar nova entrada
          localPayment = new AsaasPayment();
          localPayment.registrationId = registrationId;
          localPayment.asaasPaymentId = asaasPayment.id;
          localPayment.asaasInstallmentId = installmentId;
          localPayment.asaasCustomerId = asaasPayment.customer;
          localPayment.billingType = asaasPayment.billingType as any;
          localPayment.status = asaasPayment.status as AsaasPaymentStatus;
          localPayment.value = asaasPayment.value;
          localPayment.netValue = asaasPayment.netValue;
          localPayment.dueDate = asaasPayment.dueDate;
          localPayment.description = asaasPayment.description;
          localPayment.invoiceUrl = asaasPayment.invoiceUrl;
          localPayment.bankSlipUrl = asaasPayment.bankSlipUrl;
          localPayment.rawResponse = asaasPayment;
          localPayment.webhookData = {
            createdBy: 'sync',
            syncDate: new Date().toISOString()
          };
          
          if (asaasPayment.paymentDate) {
            localPayment.paymentDate = new Date(asaasPayment.paymentDate);
          }
          
          if (asaasPayment.clientPaymentDate) {
            localPayment.clientPaymentDate = new Date(asaasPayment.clientPaymentDate);
          }
          
          // Buscar QR Code PIX se for necessário
          if (asaasPayment.billingType === 'PIX' && asaasPayment.status === 'PENDING') {
            try {
              const pixQrCode = await this.asaasService.getPixQrCode(asaasPayment.id);
              localPayment.pixQrCode = pixQrCode.encodedImage;
              localPayment.pixCopyPaste = pixQrCode.payload;
            } catch (error) {
              console.warn(`Erro ao buscar QR Code PIX para parcela ${asaasPayment.id}:`, error);
            }
          }
          
          localPayment = await this.paymentRepository.save(localPayment);
          
          // Atualizar o status da inscrição após criar nova parcela
          await this.updateSeasonRegistrationStatus(registrationId);
          
          // Adicionar à lista de resultados
          const paymentData: RegistrationPaymentData = {
            id: localPayment.id,
            registrationId: localPayment.registrationId,
            billingType: localPayment.billingType,
            value: localPayment.value,
            dueDate: this.asaasService.formatDateForAsaas(localPayment.dueDate),
            status: localPayment.status,
            installmentNumber: asaasPayment.installmentNumber,
            installmentCount: asaasInstallmentPayments.length,
            invoiceUrl: localPayment.invoiceUrl,
            bankSlipUrl: localPayment.bankSlipUrl,
            paymentLink: asaasPayment.paymentLink || localPayment.invoiceUrl,
            pixQrCode: localPayment.pixQrCode,
            pixCopyPaste: localPayment.pixCopyPaste,
          };
          
          updatedPayments.push(paymentData);
        } else {
          // Parcela existe - atualizar se necessário
          if (localPayment.status !== asaasPayment.status) {
            localPayment.status = asaasPayment.status as AsaasPaymentStatus;
            localPayment.webhookData = {
              ...localPayment.webhookData,
              lastSync: new Date().toISOString(),
              syncSource: 'manual',
              previousStatus: localPayment.status
            };
            
            if (asaasPayment.paymentDate) {
              localPayment.paymentDate = new Date(asaasPayment.paymentDate);
            }
            
            if (asaasPayment.clientPaymentDate) {
              localPayment.clientPaymentDate = new Date(asaasPayment.clientPaymentDate);
            }
            
            if (asaasPayment.invoiceUrl) {
              localPayment.invoiceUrl = asaasPayment.invoiceUrl;
            }
            
            localPayment = await this.paymentRepository.save(localPayment);
            
            // Atualizar o status da inscrição após atualizar parcela existente
            await this.updateSeasonRegistrationStatus(registrationId);
            
            // Adicionar à lista de resultados
            const paymentData: RegistrationPaymentData = {
              id: localPayment.id,
              registrationId: localPayment.registrationId,
              billingType: localPayment.billingType,
              value: localPayment.value,
              dueDate: this.asaasService.formatDateForAsaas(localPayment.dueDate),
              status: localPayment.status,
              installmentNumber: asaasPayment.installmentNumber,
              installmentCount: asaasInstallmentPayments.length,
              invoiceUrl: localPayment.invoiceUrl,
              bankSlipUrl: localPayment.bankSlipUrl,
              paymentLink: asaasPayment.paymentLink || localPayment.invoiceUrl,
              pixQrCode: localPayment.pixQrCode,
              pixCopyPaste: localPayment.pixCopyPaste,
            };
            
            updatedPayments.push(paymentData);
          }
        }
      }
      
      // Atualizar o status da inscrição após sincronizar todas as parcelas
      await this.updateSeasonRegistrationStatus(registrationId);
      
      return updatedPayments.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca dados de pagamento de uma inscrição
   */
  async getPaymentData(registrationId: string): Promise<RegistrationPaymentData[] | null> {
    // Buscar a inscrição para verificar o status de pagamento
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId }
    });

    if (!registration) {
      return null;
    }

    // Buscar pagamentos Asaas
    const asaasPayments = await this.paymentRepository.find({ 
      where: { registrationId },
      order: { dueDate: 'ASC' } 
    });

    // Se é uma inscrição administrativa (exempt ou direct_payment) e não há pagamentos Asaas
    if ((registration.paymentStatus === 'exempt' || registration.paymentStatus === 'direct_payment') && 
        (!asaasPayments || asaasPayments.length === 0)) {
      
      // Criar um registro virtual para pagamento administrativo
      const virtualPayment: RegistrationPaymentData = {
        id: `admin_${registrationId}`,
        registrationId: registrationId,
        billingType: registration.paymentMethod === 'admin_exempt' ? 'ADMIN_EXEMPT' : 'ADMIN_DIRECT',
        value: registration.amount,
        dueDate: new Date(registration.createdAt).toISOString().split('T')[0], // Usar data de criação
        status: registration.paymentStatus === 'exempt' ? 'EXEMPT' : 'DIRECT_PAYMENT',
        installmentNumber: 1,
        installmentCount: 1,
        invoiceUrl: null,
        bankSlipUrl: null,
        paymentLink: null,
        pixQrCode: null,
        pixCopyPaste: null,
      };

      return [virtualPayment];
    }

    // Se há pagamentos Asaas, processar normalmente
    if (asaasPayments && asaasPayments.length > 0) {
      const paymentData: RegistrationPaymentData[] = asaasPayments.map(p => {
        // Garantir que dueDate seja um objeto Date válido
        let formattedDueDate: string = typeof p.dueDate === 'string' ? p.dueDate : this.asaasService.formatDateForAsaas(p.dueDate);

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

      // Se é uma inscrição administrativa (exempt ou direct_payment), adicionar o pagamento administrativo virtual
      if (registration.paymentStatus === 'exempt' || registration.paymentStatus === 'direct_payment') {
        const virtualPayment: RegistrationPaymentData = {
          id: `admin_${registrationId}`,
          registrationId: registrationId,
          billingType: registration.paymentMethod === 'admin_exempt' ? 'ADMIN_EXEMPT' : 'ADMIN_DIRECT',
          value: registration.amount,
          dueDate: new Date(registration.createdAt).toISOString().split('T')[0],
          status: registration.paymentStatus === 'exempt' ? 'EXEMPT' : 'DIRECT_PAYMENT',
          installmentNumber: 0, // Colocar antes das parcelas Asaas
          installmentCount: 1,
          invoiceUrl: null,
          bankSlipUrl: null,
          paymentLink: null,
          pixQrCode: null,
          pixCopyPaste: null,
        };
        
        paymentData.push(virtualPayment);
      }

      // Ordenar corretamente: primeiro por installmentNumber, depois por dueDate
      const sortedPayments = paymentData.sort((a, b) => {
        // Se ambos têm installmentNumber, ordenar por ele
        if (a.installmentNumber && b.installmentNumber) {
          return a.installmentNumber - b.installmentNumber;
        }
        
        // Se apenas um tem installmentNumber, ele vem primeiro
        if (a.installmentNumber && !b.installmentNumber) return -1;
        if (!a.installmentNumber && b.installmentNumber) return 1;
        
        // Se nenhum tem installmentNumber, ordenar por data de vencimento
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      return sortedPayments;
    }

    // Se não há pagamentos Asaas e não é administrativa, retornar null
    return null;
  }

  /**
   * Salva todas as parcelas de um installment plan no banco de dados
   */
  private async saveAllInstallmentPayments(
    registrationId: string, 
    installmentPlanId: string, 
    asaasCustomerId: string,
    installmentPayments: any[]
  ): Promise<void> {
    try {
      // Ordenar as parcelas por installmentNumber antes de salvar
      const sortedPayments = installmentPayments.sort((a, b) => {
        const aNum = a.installmentNumber || 999;
        const bNum = b.installmentNumber || 999;
        return aNum - bNum;
      });
      
      for (const payment of sortedPayments) {
        // Verificar se a parcela já existe no banco
        const existingPayment = await this.paymentRepository.findOne({
          where: { asaasPaymentId: payment.id }
        });
        
        if (existingPayment) {
          continue;
        }
        
        const asaasPayment = new AsaasPayment();
        asaasPayment.registrationId = registrationId;
        asaasPayment.asaasPaymentId = payment.id;
        asaasPayment.asaasInstallmentId = installmentPlanId;
        asaasPayment.asaasCustomerId = asaasCustomerId;
        asaasPayment.billingType = AsaasBillingType.PIX;
        asaasPayment.status = payment.status as AsaasPaymentStatus;
        asaasPayment.value = payment.value;
        asaasPayment.netValue = payment.netValue;
        asaasPayment.dueDate = payment.dueDate;
        asaasPayment.description = payment.description || null;
        asaasPayment.invoiceUrl = payment.invoiceUrl || null;
        asaasPayment.bankSlipUrl = payment.bankSlipUrl || null;
        asaasPayment.rawResponse = payment;
        
        // Buscar QR Code PIX para cada parcela
        try {
          const pixQrCode = await this.asaasService.getPixQrCode(payment.id);
          asaasPayment.pixQrCode = pixQrCode.encodedImage;
          asaasPayment.pixCopyPaste = pixQrCode.payload;
        } catch (error) {
          console.warn(`Erro ao buscar QR Code PIX para parcela ${payment.id}:`, error);
        }
        
        await this.paymentRepository.save(asaasPayment);
        
        // Atualizar o status da inscrição após salvar cada parcela
        await this.updateSeasonRegistrationStatus(registrationId);
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualiza as categorias de uma inscrição
   * Mantém a mesma quantidade de categorias que o piloto se inscreveu originalmente
   */
  async updateRegistrationCategories(registrationId: string, newCategoryIds: string[]): Promise<SeasonRegistration> {
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    // Verificar se a inscrição pode ser alterada
    if (registration.status === RegistrationStatus.CANCELLED || registration.status === RegistrationStatus.EXPIRED) {
      throw new BadRequestException('Não é possível alterar categorias de uma inscrição cancelada ou expirada');
    }

    // Verificar se a quantidade de categorias é a mesma
    const currentCategoryCount = registration.categories?.length || 0;
    if (newCategoryIds.length !== currentCategoryCount) {
      throw new BadRequestException(`A quantidade de categorias deve ser a mesma. Atual: ${currentCategoryCount}, Nova: ${newCategoryIds.length}`);
    }

    // Verificar se as novas categorias existem e pertencem à temporada
    const categories = await this.categoryRepository.find({
      where: { 
        id: In(newCategoryIds),
        seasonId: registration.seasonId
      }
    });

    if (categories.length !== newCategoryIds.length) {
      throw new BadRequestException('Uma ou mais categorias são inválidas ou não pertencem a esta temporada');
    }

    // Remover categorias atuais
    if (registration.categories && registration.categories.length > 0) {
      await this.registrationCategoryRepository.delete({
        registrationId: registrationId
      });
    }

    // Adicionar novas categorias
    const registrationCategories = categories.map(category => 
      this.registrationCategoryRepository.create({
        registrationId: registrationId,
        categoryId: category.id
      })
    );
    
    await this.registrationCategoryRepository.save(registrationCategories);

    // Buscar a inscrição atualizada com as novas categorias
    const updatedRegistration = await this.findById(registrationId);
    if (!updatedRegistration) {
      throw new NotFoundException('Erro ao atualizar inscrição');
    }

    return updatedRegistration;
  }

  /**
   * Adiciona etapas a uma inscrição existente com pagamento administrativo
   */
  async addStagesToRegistration(registrationId: string, data: AddStagesToRegistrationData): Promise<SeasonRegistration> {
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    // Verificar se a inscrição pode ser alterada
    if (registration.status === RegistrationStatus.CANCELLED || registration.status === RegistrationStatus.EXPIRED) {
      throw new BadRequestException('Não é possível adicionar etapas a uma inscrição cancelada ou expirada');
    }

    // Verificar se a inscrição está confirmada ou é administrativa
    if (registration.status !== RegistrationStatus.CONFIRMED && 
        registration.paymentStatus !== PaymentStatus.EXEMPT && 
        registration.paymentStatus !== PaymentStatus.DIRECT_PAYMENT) {
      throw new BadRequestException('Apenas inscrições confirmadas ou administrativas podem ter etapas adicionadas');
    }

    // Buscar a temporada para verificar o tipo de inscrição
    const season = await this.seasonRepository.findOne({ where: { id: registration.seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Verificar se a temporada permite inscrições por etapa
    if (season.inscriptionType !== 'por_etapa') {
      throw new BadRequestException('Apenas temporadas com inscrições por etapa permitem adição de etapas');
    }

    // Verificar se as etapas existem e pertencem à temporada
    if (!data.stageIds || data.stageIds.length === 0) {
      throw new BadRequestException('Pelo menos uma etapa deve ser selecionada');
    }

    const stages = await this.stageRepository.find({
      where: { 
        id: In(data.stageIds),
        seasonId: registration.seasonId
      }
    });

    if (stages.length !== data.stageIds.length) {
      throw new BadRequestException('Uma ou mais etapas são inválidas ou não pertencem a esta temporada');
    }

    // Verificar se as etapas já estão vinculadas à inscrição
    const existingStages = await this.registrationStageRepository.find({
      where: { registrationId: registrationId }
    });

    const existingStageIds = existingStages.map(stage => stage.stageId);
    const duplicateStageIds = data.stageIds.filter(stageId => existingStageIds.includes(stageId));

    if (duplicateStageIds.length > 0) {
      const duplicateStages = await this.stageRepository.find({
        where: { id: In(duplicateStageIds) }
      });
      const stageNames = duplicateStages.map(stage => stage.name).join(', ');
      throw new BadRequestException(`O piloto já está inscrito nas seguintes etapas: ${stageNames}`);
    }

    // Adicionar novas etapas
    const registrationStages = stages.map(stage => 
      this.registrationStageRepository.create({
        registrationId: registrationId,
        stageId: stage.id
      })
    );
    
    await this.registrationStageRepository.save(registrationStages);

    // Atualizar o valor total da inscrição
    if (data.amount > 0) {
      registration.amount = Number(registration.amount) + data.amount;
      await this.registrationRepository.save(registration);
    }

    // Criar pagamento administrativo para as novas etapas
    if (data.amount > 0 || data.paymentStatus === 'exempt') {
      const today = new Date();
      const dueDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const paymentData = this.paymentRepository.create({
        registrationId: registrationId,
        asaasPaymentId: `admin_stage_${registrationId}_${Date.now()}`, // ID único para pagamentos administrativos
        asaasCustomerId: 'admin_customer', // Customer genérico para pagamentos administrativos
        billingType: AsaasBillingType.PIX, // Usado apenas como placeholder
        value: data.amount,
        dueDate: dueDateString,
        status: AsaasPaymentStatus.RECEIVED, // Marcar como recebido para administrativo
        description: data.notes || `Pagamento administrativo para etapas adicionais: ${stages.map(s => s.name).join(', ')}`,
        paymentDate: today,
        clientPaymentDate: today
      });

      await this.paymentRepository.save(paymentData);

      // Atualizar status da inscrição baseado nos pagamentos
      await this.updateSeasonRegistrationStatus(registrationId);
    }

    // Buscar a inscrição atualizada com as novas etapas
    const updatedRegistration = await this.findById(registrationId);
    if (!updatedRegistration) {
      throw new NotFoundException('Erro ao atualizar inscrição');
    }

    return updatedRegistration;
  }

  /**
   * Atualiza o status da SeasonRegistration baseado nos status dos pagamentos
   * Este método é chamado sempre que um pagamento é criado ou atualizado
   */
  private async updateSeasonRegistrationStatus(registrationId: string): Promise<void> {
    try {
      // Buscar todos os pagamentos da inscrição
      const payments = await this.paymentRepository.find({
        where: { registrationId },
        order: { dueDate: 'ASC' }
      });

      if (!payments || payments.length === 0) {
        // Se não há pagamentos, verificar se é uma inscrição administrativa
        const registration = await this.registrationRepository.findOne({
          where: { id: registrationId }
        });

        if (!registration) {
          return;
        }

        // Se não é uma inscrição administrativa e não há pagamentos, remover completamente a inscrição
        if (registration.paymentStatus !== 'exempt' && registration.paymentStatus !== 'direct_payment') {
          // Remover categorias e etapas vinculadas primeiro
          await this.registrationCategoryRepository.delete({ registrationId });
          await this.registrationStageRepository.delete({ registrationId });
          
          // Remover a inscrição completamente
          await this.registrationRepository.remove(registration);
          console.log(`[WEBHOOK] Inscrição removida completamente por falta de pagamentos: ${registrationId}`);
        }
        return;
      }

      // Buscar a inscrição
      const registration = await this.registrationRepository.findOne({
        where: { id: registrationId }
      });

      if (!registration) {
        return;
      }

      // Calcular totais e verificar status
      let totalPayments = 0;
      let totalPaid = 0;
      let allPaymentsPaid = true;
      let anyPaymentFailed = false;
      let anyPaymentCancelled = false;
      let anyPaymentRefunded = false;

      for (const payment of payments) {
        totalPayments += payment.value;

        // Verificar se todos os pagamentos estão pagos
        if (!['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status)) {
          allPaymentsPaid = false;
        }

        // Verificar se algum pagamento falhou
        if (['OVERDUE', 'AWAITING_RISK_ANALYSIS'].includes(payment.status)) {
          anyPaymentFailed = true;
        }

        // Verificar se algum pagamento foi cancelado
        if (['REFUND_REQUESTED', 'REFUND_IN_PROGRESS'].includes(payment.status)) {
          anyPaymentCancelled = true;
        }

        // Verificar se algum pagamento foi reembolsado
        if (payment.status === 'REFUNDED') {
          anyPaymentRefunded = true;
        }

        // Somar valores pagos
        if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status)) {
          totalPaid += payment.value;
        }
      }

      // Determinar o novo status baseado na análise
      let newPaymentStatus: PaymentStatus;
      let newRegistrationStatus: RegistrationStatus;
      let paymentDate: Date | null = null;
      let confirmedAt: Date | null = null;
      let cancelledAt: Date | null = null;
      let cancellationReason: string | null = null;

      if (anyPaymentRefunded) {
        // Se algum pagamento foi reembolsado
        newPaymentStatus = PaymentStatus.REFUNDED;
        newRegistrationStatus = RegistrationStatus.CANCELLED;
        cancelledAt = new Date();
        cancellationReason = 'Pagamento reembolsado';
      } else if (anyPaymentCancelled) {
        // Se algum pagamento foi cancelado
        newPaymentStatus = PaymentStatus.CANCELLED;
        newRegistrationStatus = RegistrationStatus.CANCELLED;
        cancelledAt = new Date();
        cancellationReason = 'Pagamento cancelado';
      } else if (anyPaymentFailed) {
        // Se algum pagamento falhou
        newPaymentStatus = PaymentStatus.FAILED;
        newRegistrationStatus = RegistrationStatus.PAYMENT_PENDING;
      } else if (allPaymentsPaid && totalPaid >= totalPayments) {
        // Se todos os pagamentos estão pagos e o valor total foi pago
        newPaymentStatus = PaymentStatus.PAID;
        newRegistrationStatus = RegistrationStatus.CONFIRMED;
        paymentDate = new Date();
        confirmedAt = new Date();
      } else if (totalPaid > 0 && totalPaid < totalPayments) {
        // Se parte do valor foi pago (pagamento parcial)
        newPaymentStatus = PaymentStatus.PROCESSING;
        newRegistrationStatus = RegistrationStatus.PAYMENT_PENDING;
      } else {
        // Caso padrão: pagamento pendente
        newPaymentStatus = PaymentStatus.PENDING;
        newRegistrationStatus = RegistrationStatus.PAYMENT_PENDING;
      }

      // Verificar se houve mudança de status
      const statusChanged = 
        registration.paymentStatus !== newPaymentStatus ||
        registration.status !== newRegistrationStatus;

      if (statusChanged) {
        // Atualizar a inscrição
        registration.paymentStatus = newPaymentStatus;
        registration.status = newRegistrationStatus;
        
        if (paymentDate) {
          registration.paymentDate = paymentDate;
        }
        
        if (confirmedAt) {
          registration.confirmedAt = confirmedAt;
        }
        
        if (cancelledAt) {
          registration.cancelledAt = cancelledAt;
        }
        
        if (cancellationReason) {
          registration.cancellationReason = cancellationReason;
        }

        registration.updatedAt = new Date();

        await this.registrationRepository.save(registration);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca detalhes completos do piloto inscrito
   */
  async getPilotDetails(registrationId: string): Promise<{
    registration: SeasonRegistration;
    user: User;
    profile: any;
    payments: RegistrationPaymentData[];
  } | null> {
    // Buscar a inscrição com todas as relações
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['user', 'season', 'season.championship', 'categories', 'categories.category', 'stages', 'stages.stage', 'payments']
    });

    if (!registration) {
      return null;
    }

    // Buscar o perfil completo do usuário
    const memberProfileRepository = AppDataSource.getRepository('MemberProfiles');
    const profile = await memberProfileRepository.findOne({
      where: { id: registration.userId }
    });

    // Buscar dados de pagamento
    const paymentData = await this.getPaymentData(registrationId);

    return {
      registration,
      user: registration.user,
      profile: profile || null,
      payments: paymentData || []
    };
  }
} 