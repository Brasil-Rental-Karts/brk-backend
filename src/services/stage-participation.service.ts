import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { StageParticipation, ParticipationStatus } from '../models/stage-participation.entity';
import { SeasonRegistration, RegistrationStatus } from '../models/season-registration.entity';
import { SeasonRegistrationCategory } from '../models/season-registration-category.entity';
import { Stage } from '../models/stage.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

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
  private stageRepository: Repository<Stage>;

  constructor() {
    this.participationRepository = AppDataSource.getRepository(StageParticipation);
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.registrationCategoryRepository = AppDataSource.getRepository(SeasonRegistrationCategory);
    this.stageRepository = AppDataSource.getRepository(Stage);
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

    // Verificar se o usuário está inscrito na temporada da etapa
    const registration = await this.registrationRepository.findOne({
      where: { 
        userId, 
        seasonId: stage.seasonId,
        status: RegistrationStatus.CONFIRMED
      },
      relations: ['categories', 'categories.category']
    });

    if (!registration) {
      throw new BadRequestException('Usuário não está inscrito nesta temporada ou inscrição não confirmada');
    }

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

    // Buscar inscrição do usuário na temporada
    const registration = await this.registrationRepository.findOne({
      where: { 
        userId, 
        seasonId: stage.seasonId,
        status: RegistrationStatus.CONFIRMED
      },
      relations: ['categories', 'categories.category']
    });

    if (!registration) {
      return [];
    }

    // Filtrar categorias que estão disponíveis na etapa e o usuário está inscrito
    // categoryIds pode ser string ou array, então vamos normalizar
    const stageCategoryIds = Array.isArray(stage.categoryIds) 
      ? stage.categoryIds 
      : stage.categoryIds ? (stage.categoryIds as string).split(',').map(id => id.trim()) : [];
    
    const availableCategories = registration.categories.filter(regCategory =>
      stageCategoryIds.includes(regCategory.categoryId)
    );

    // Verificar quais categorias o usuário já confirmou participação
    const confirmedParticipations = await this.participationRepository.find({
      where: { userId, stageId, status: ParticipationStatus.CONFIRMED }
    });

    const confirmedCategoryIds = confirmedParticipations.map(p => p.categoryId);

    return availableCategories.map(regCategory => ({
      id: regCategory.categoryId,
      name: regCategory.category.name,
      ballast: regCategory.category.ballast,
      isConfirmed: confirmedCategoryIds.includes(regCategory.categoryId)
    }));
  }
} 