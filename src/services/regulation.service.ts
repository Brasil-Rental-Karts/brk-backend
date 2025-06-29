import { Regulation } from '../models/regulation.entity';
import { RegulationRepository } from '../repositories/regulation.repository';
import { BaseService } from './base.service';
import { CreateRegulationDto, UpdateRegulationDto, ReorderRegulationsDto, RegulationResponseDto } from '../dtos/regulation.dto';
import { NotFoundException } from '../exceptions/not-found.exception';
import { RedisService } from './redis.service';

export interface RegulationCacheData {
  id: string;
  title: string;
  content: string;
  order: number;
  isActive: boolean;
  seasonId: string;
}

export class RegulationService extends BaseService<Regulation> {
  private redisService: RedisService;

  constructor(
    private regulationRepository: RegulationRepository
  ) {
    super(regulationRepository);
    this.redisService = RedisService.getInstance();
  }

  async createRegulation(dto: CreateRegulationDto): Promise<RegulationResponseDto> {
    // If order is not provided, get the next available order
    if (!dto.order) {
      dto.order = await this.regulationRepository.getNextOrder(dto.seasonId);
    }

    const regulation = await this.regulationRepository.create({
      title: dto.title,
      content: dto.content,
      seasonId: dto.seasonId,
      order: dto.order,
      isActive: dto.isActive ?? true
    });

    // Cache the new regulation
    if (regulation) {
      await this.redisService.cacheRegulationBasicInfo(regulation.id, regulation);
    }

    return this.mapToResponseDto(regulation);
  }

  async updateRegulation(id: string, dto: UpdateRegulationDto): Promise<RegulationResponseDto> {
    const regulation = await this.regulationRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    const updatedRegulation = await this.regulationRepository.update(id, dto);
    if (!updatedRegulation) {
      throw new NotFoundException('Regulation not found');
    }

    // Invalidate cache and recache the updated regulation
    await this.redisService.invalidateRegulationCache(id, updatedRegulation.seasonId);
    await this.redisService.cacheRegulationBasicInfo(updatedRegulation.id, updatedRegulation);
    
    return this.mapToResponseDto(updatedRegulation);
  }

  async deleteRegulation(id: string): Promise<void> {
    const regulation = await this.regulationRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    await this.regulationRepository.delete(id);
    
    // Invalidate cache
    await this.redisService.invalidateRegulationCache(id, regulation.seasonId);
  }

  async findBySeasonId(seasonId: string): Promise<RegulationResponseDto[]> {
    const regulations = await this.regulationRepository.findBySeasonId(seasonId);
    return regulations.map(regulation => this.mapToResponseDto(regulation));
  }

  async findBySeasonIdOrdered(seasonId: string): Promise<RegulationResponseDto[]> {
    const regulations = await this.regulationRepository.findBySeasonIdOrdered(seasonId);
    return regulations.map(regulation => this.mapToResponseDto(regulation));
  }

  async reorderRegulations(dto: ReorderRegulationsDto): Promise<void> {
    await this.regulationRepository.reorderRegulations(dto.seasonId, dto.regulationOrders);
    
    // Invalidate cache for all regulations in the season
    const regulationIds = dto.regulationOrders.map(order => order.id);
    await Promise.all(
      regulationIds.map(id => this.redisService.invalidateRegulationCache(id, dto.seasonId))
    );
  }

  async toggleActive(id: string): Promise<RegulationResponseDto> {
    const regulation = await this.regulationRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    const updatedRegulation = await this.regulationRepository.update(id, {
      isActive: !regulation.isActive
    });
    
    if (!updatedRegulation) {
      throw new NotFoundException('Regulation not found');
    }

    // Invalidate cache and recache the updated regulation
    await this.redisService.invalidateRegulationCache(id, updatedRegulation.seasonId);
    await this.redisService.cacheRegulationBasicInfo(updatedRegulation.id, updatedRegulation);

    return this.mapToResponseDto(updatedRegulation);
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedRegulationData(id: string): Promise<RegulationCacheData | null> {
    try {
      return await this.redisService.getCachedRegulationBasicInfo(id);
    } catch (error) {
      return null;
    }
  }

  private mapToResponseDto(regulation: Regulation): RegulationResponseDto {
    return {
      id: regulation.id,
      title: regulation.title,
      content: regulation.content,
      order: regulation.order,
      isActive: regulation.isActive,
      seasonId: regulation.seasonId,
      createdAt: regulation.createdAt,
      updatedAt: regulation.updatedAt
    };
  }
} 