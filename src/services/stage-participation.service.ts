import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { StageParticipation, ParticipationStatus } from '../models/stage-participation.entity';
import { SeasonRegistration, RegistrationStatus } from '../models/season-registration.entity';
import { SeasonRegistrationCategory } from '../models/season-registration-category.entity';
import { SeasonRegistrationStage } from '../models/season-registration-stage.entity';
import { Stage } from '../models/stage.entity';
import { Season, InscriptionType } from '../models/season.entity';
import { AsaasPayment, AsaasPaymentStatus } from '../models/asaas-payment.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { In } from 'typeorm';

/**
 * StageParticipationService
 * 
 * Serviço responsável por gerenciar as participações dos usuários em etapas.
 * 
 * FUNCIONALIDADES DE VALIDAÇÃO DE PAGAMENTO:
 * 
 * 1. TEMPORADAS POR_TEMPORADA:
 *    PERMITE PARTICIPAÇÃO:
 *    - Usuário já pagou a totalidade da temporada (paymentStatus = 'paid')
 *    - Usuário tem pagamento isento (paymentStatus = 'exempt')  
 *    - Usuário tem pagamento direto (paymentStatus = 'direct_payment')
 *    - Usuário tem pelo menos uma parcela paga (independente das outras)
 *    
 *    BLOQUEIA PARTICIPAÇÃO:
 *    - Usuário tem alguma parcela vencida (status = 'OVERDUE')
 *    - Usuário não tem nenhuma parcela paga (todas pendentes ou outros status)
 * 
 * 2. TEMPORADAS POR_ETAPA:
 *    PERMITE PARTICIPAÇÃO:
 *    - Usuário já pagou a totalidade da inscrição (paymentStatus = 'paid')
 *    - Usuário tem pagamento isento (paymentStatus = 'exempt')
 *    - Usuário tem pagamento direto (paymentStatus = 'direct_payment')
 *    - Usuário está inscrito na etapa específica E tem pelo menos um pagamento confirmado
 *    
 *    BLOQUEIA PARTICIPAÇÃO:
 *    - Usuário tem alguma parcela vencida (status = 'OVERDUE')
 *    - Usuário não está inscrito na etapa específica (sem SeasonRegistrationStage)
 *    - Usuário não tem nenhum pagamento confirmado
 * 
 * Esta validação é aplicada tanto no método confirmParticipation() quanto no
 * método getAvailableCategoriesForUser() para fornecer feedback ao usuário.
 */

export interface CreateParticipationData {
  userId: string;
  stageId: string;
  categoryId: string;
}

export interface StageParticipationWithDetails extends StageParticipation {
  stage: Stage;
}

export class StageParticipationService {
  private participationRepository: Repository<StageParticipation>;
  private registrationRepository: Repository<SeasonRegistration>;
  private registrationCategoryRepository: Repository<SeasonRegistrationCategory>;
  private registrationStageRepository: Repository<SeasonRegistrationStage>;
  private stageRepository: Repository<Stage>;
  private seasonRepository: Repository<Season>;
  private paymentRepository: Repository<AsaasPayment>;

  constructor() {
    this.participationRepository = AppDataSource.getRepository(StageParticipation);
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.registrationCategoryRepository = AppDataSource.getRepository(SeasonRegistrationCategory);
    this.registrationStageRepository = AppDataSource.getRepository(SeasonRegistrationStage);
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.paymentRepository = AppDataSource.getRepository(AsaasPayment);
  }

  /**
   * Verifica se o usuário pode participar de uma etapa baseado no status de pagamento
   * Para temporadas por_temporada, verifica se há parcelas vencidas
   * Para temporadas por_etapa, verifica se a etapa foi paga
   */
  private async validatePaymentForParticipation(registration: SeasonRegistration, season: Season, stageId?: string): Promise<void> {

    // Buscar os pagamentos da inscrição
    const payments = await this.paymentRepository.find({
      where: { registrationId: registration.id },
      order: { dueDate: 'ASC' }
    });

    if (registration.paymentStatus != 'paid' && registration.paymentStatus != 'exempt' && registration.paymentStatus != 'direct_payment') {
    
      if (!payments || payments.length === 0) {
        throw new BadRequestException('Nenhum pagamento encontrado para esta inscrição');
      }
      
      // Verificar se há parcelas vencidas
      const hasOverduePayments = payments.some(payment => 
        payment.status === AsaasPaymentStatus.OVERDUE
      );
      
      if (hasOverduePayments) {
        throw new BadRequestException('Não é possível confirmar participação pois há parcelas vencidas. Por favor, quite as parcelas em atraso para participar das etapas.');
      }
    }
    
    if (season.hasPaymentCondition('por_temporada')) {
      // Se é isento ou pagamento direto, sempre permitir
      if (registration.paymentStatus === 'paid' || registration.paymentStatus === 'exempt' || registration.paymentStatus === 'direct_payment') {
        return;
      }
      // Para temporadas por_temporada: verificar se há pelo menos uma parcela paga
      const hasPaidPayments = payments.some(payment => 
        [AsaasPaymentStatus.RECEIVED, AsaasPaymentStatus.CONFIRMED, AsaasPaymentStatus.RECEIVED_IN_CASH].includes(payment.status)
      );

      if (!hasPaidPayments) {
        throw new BadRequestException('Para participar das etapas é necessário ter pelo menos uma parcela paga da temporada.');
      }
    } else if (season.hasPaymentCondition('por_etapa') && stageId) {
      // Para temporadas por_etapa: verificar se o usuário está inscrito na etapa específica
      const stageRegistration = await this.registrationStageRepository.findOne({
        where: {
          registrationId: registration.id,
          stageId: stageId
        }
      });

      if (!stageRegistration) {
        throw new BadRequestException('Usuário não está inscrito nesta etapa específica');
      }

      if (registration.paymentStatus != 'paid' && registration.paymentStatus != 'exempt' && registration.paymentStatus != 'direct_payment') {
        throw new BadRequestException('Usuário não está inscrito nesta etapa específica');
      }

      // Verificar se há pelo menos um pagamento pago para a inscrição
      // (já que os pagamentos em por_etapa cobrem todas as etapas inscritas)
      const hasPaidPayments = payments.some(payment => 
        [AsaasPaymentStatus.RECEIVED, AsaasPaymentStatus.CONFIRMED, AsaasPaymentStatus.RECEIVED_IN_CASH].includes(payment.status)
      );

      if (!hasPaidPayments && (registration.paymentStatus != 'exempt' && registration.paymentStatus != 'direct_payment')) {
        throw new BadRequestException('Para participar da etapa é necessário ter pelo menos um pagamento confirmado.');
      }
    }
  }

  /**
   * Confirmar participação do usuário em uma etapa
   */
  async confirmParticipation(data: CreateParticipationData): Promise<StageParticipation> {
    const { userId, stageId, categoryId } = data;

    // Verificar se a etapa existe
    const stage = await this.stageRepository.findOne({ where: { id: stageId } });
    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Buscar informações da temporada
    const season = await this.seasonRepository.findOne({ where: { id: stage.seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Verificar se o usuário está inscrito na temporada da etapa
    const registration = await this.registrationRepository.findOne({
      where: { 
        userId, 
        seasonId: stage.seasonId,
        status: In([RegistrationStatus.CONFIRMED, RegistrationStatus.PAYMENT_PENDING])
      },
      relations: ['categories', 'categories.category']
    });

    if (!registration) {
      throw new BadRequestException('Usuário não está inscrito nesta temporada');
    }

    // Validar status de pagamento para temporadas por_temporada e por_etapa
    await this.validatePaymentForParticipation(registration, season, stageId);

    // Verificar se o usuário está inscrito na categoria específica
    const hasCategory = registration.categories.some(regCategory => 
      regCategory.categoryId === categoryId
    );

    if (!hasCategory) {
      throw new BadRequestException('Usuário não está inscrito nesta categoria');
    }

    // Verificar se a categoria está disponível na etapa
    // categoryIds pode ser string ou array, então vamos normalizar
    const stageCategoryIds = Array.isArray(stage.categoryIds) 
      ? stage.categoryIds 
      : stage.categoryIds ? (stage.categoryIds as string).split(',').map(id => id.trim()) : [];
    
    if (!stageCategoryIds.includes(categoryId)) {
      throw new BadRequestException('Esta categoria não está disponível nesta etapa');
    }

    // Verificar se já existe participação
    const existingParticipation = await this.participationRepository.findOne({
      where: { userId, stageId, categoryId }
    });

    if (existingParticipation) {
      if (existingParticipation.status === ParticipationStatus.CONFIRMED) {
        throw new BadRequestException('Participação já confirmada para esta etapa');
      } else {
        // Reativar participação cancelada
        existingParticipation.status = ParticipationStatus.CONFIRMED;
        existingParticipation.confirmedAt = new Date();
        existingParticipation.cancelledAt = null;
        existingParticipation.cancellationReason = null;
        return await this.participationRepository.save(existingParticipation);
      }
    }

    // Criar nova participação
    const participation = this.participationRepository.create({
      userId,
      stageId,
      categoryId,
      status: ParticipationStatus.CONFIRMED,
      confirmedAt: new Date()
    });

    return await this.participationRepository.save(participation);
  }

  /**
   * Cancelar participação do usuário em uma etapa
   */
  async cancelParticipation(userId: string, stageId: string, categoryId: string, reason?: string): Promise<void> {
    const participation = await this.participationRepository.findOne({
      where: { userId, stageId, categoryId, status: ParticipationStatus.CONFIRMED }
    });

    if (!participation) {
      throw new NotFoundException('Participação confirmada não encontrada');
    }

    participation.status = ParticipationStatus.CANCELLED;
    participation.cancelledAt = new Date();
    participation.cancellationReason = reason || 'Cancelado pelo usuário';

    await this.participationRepository.save(participation);
  }

  /**
   * Buscar participações de um usuário
   */
  async findByUserId(userId: string): Promise<StageParticipation[]> {
    return await this.participationRepository.find({
      where: { userId, status: ParticipationStatus.CONFIRMED },
      relations: ['stage', 'category'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Buscar participações de uma etapa
   */
  async findByStageId(stageId: string): Promise<StageParticipation[]> {
    return await this.participationRepository.find({
      where: { stageId, status: ParticipationStatus.CONFIRMED },
      relations: ['user', 'category'],
      order: { confirmedAt: 'ASC' }
    });
  }

  /**
   * Verificar se usuário já confirmou participação em uma etapa
   */
  async hasUserConfirmedParticipation(userId: string, stageId: string): Promise<boolean> {
    const count = await this.participationRepository.count({
      where: { userId, stageId, status: ParticipationStatus.CONFIRMED }
    });
    return count > 0;
  }

  /**
   * Buscar participações do usuário em etapas futuras
   */
  async findUserUpcomingParticipations(userId: string): Promise<StageParticipationWithDetails[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.participationRepository
      .createQueryBuilder('participation')
      .leftJoinAndSelect('participation.stage', 'stage')
      .leftJoinAndSelect('participation.category', 'category')
      .where('participation.userId = :userId', { userId })
      .andWhere('participation.status = :status', { status: ParticipationStatus.CONFIRMED })
      .andWhere('stage.date >= :today', { today })
      .orderBy('stage.date', 'ASC')
      .addOrderBy('stage.time', 'ASC')
      .getMany() as StageParticipationWithDetails[];
  }

  /**
   * Buscar categorias disponíveis para o usuário confirmar em uma etapa
   */
  async getAvailableCategoriesForUser(userId: string, stageId: string): Promise<any[]> {
    // Buscar a etapa
    const stage = await this.stageRepository.findOne({ where: { id: stageId } });
    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Buscar informações da temporada
    const season = await this.seasonRepository.findOne({ where: { id: stage.seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Buscar inscrição do usuário na temporada (incluindo inscrições com pagamento pendente)
    const registration = await this.registrationRepository.findOne({
      where: { 
        userId, 
        seasonId: stage.seasonId,
        status: In([RegistrationStatus.CONFIRMED, RegistrationStatus.PAYMENT_PENDING])
      },
      relations: ['categories', 'categories.category']
    });

    if (!registration) {
      return [];
    }

    // Verificar se o usuário pode participar baseado no status de pagamento
    try {
      await this.validatePaymentForParticipation(registration, season, stageId);
    } catch (error: any) {
      // Se há problemas de pagamento, retornar array vazio (sem categorias disponíveis)
      return [];
    }

    // Filtrar categorias que estão disponíveis na etapa e o usuário está inscrito
    const stageCategoryIds = Array.isArray(stage.categoryIds) 
      ? stage.categoryIds 
      : stage.categoryIds ? (stage.categoryIds as string).split(',').map(id => id.trim()) : [];

    const availableCategories = registration.categories
      .filter(regCategory => stageCategoryIds.includes(regCategory.categoryId))
      .map(regCategory => ({
        id: regCategory.categoryId,
        name: regCategory.category.name,
        ballast: regCategory.category.ballast,
        isConfirmed: false, // Será verificado posteriormente
      }));

    // Verificar quais categorias já estão confirmadas
    const confirmedParticipations = await this.participationRepository.find({
      where: { userId, stageId, status: ParticipationStatus.CONFIRMED }
    });

    const confirmedCategoryIds = confirmedParticipations.map(p => p.categoryId);

    // Marcar categorias já confirmadas
    availableCategories.forEach(category => {
      category.isConfirmed = confirmedCategoryIds.includes(category.id);
    });

    return availableCategories;
  }
} 