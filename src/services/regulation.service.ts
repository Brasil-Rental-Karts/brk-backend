import { Regulation, RegulationStatus } from '../models/regulation.entity';
import { RegulationSection } from '../models/regulation-section.entity';
import { RegulationRepository } from '../repositories/regulation.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';

export interface RegulationCacheData {
  id: string;
  seasonId: string;
  status: RegulationStatus;
  publishedAt: Date | null;
  sections: {
    id: string;
    title: string;
    markdownContent: string;
    order: number;
    updatedAt: Date;
  }[];
  updatedAt: Date;
}

export class RegulationService extends BaseService<Regulation> {
  private redisService: RedisService;
  private regulationRepository: RegulationRepository;

  constructor(regulationRepository: RegulationRepository) {
    super(regulationRepository);
    this.regulationRepository = regulationRepository;
    this.redisService = RedisService.getInstance();
  }

  async findBySeasonId(seasonId: string): Promise<Regulation | null> {
    return this.regulationRepository.findBySeasonId(seasonId);
  }

  async findByIdWithSections(id: string): Promise<Regulation | null> {
    return this.regulationRepository.findByIdWithSections(id);
  }

  async createWithSections(
    regulationData: Partial<Regulation>, 
    sectionsData: Partial<RegulationSection>[]
  ): Promise<Regulation> {
    return this.regulationRepository.createWithSections(regulationData, sectionsData);
  }

  async updateWithSections(
    id: string,
    regulationData: Partial<Regulation>,
    sectionsData?: Partial<RegulationSection>[]
  ): Promise<Regulation | null> {
    const regulation = await this.regulationRepository.updateWithSections(id, regulationData, sectionsData);
    
    // Clear cache when updating
    if (regulation) {
      await this.clearRegulationCache(regulation.seasonId);
    }
    
    return regulation;
  }

  async reorderSections(regulationId: string, sectionsOrder: { id: string; order: number }[]): Promise<boolean> {
    const result = await this.regulationRepository.reorderSections(regulationId, sectionsOrder);
    
    // Clear cache when reordering
    if (result) {
      const regulation = await this.findById(regulationId);
      if (regulation) {
        await this.clearRegulationCache(regulation.seasonId);
      }
    }
    
    return result;
  }

  async publish(id: string): Promise<Regulation | null> {
    const regulation = await this.regulationRepository.publish(id);
    
    // Cache published regulation
    if (regulation && regulation.status === RegulationStatus.PUBLISHED) {
      await this.cachePublishedRegulation(regulation);
    }
    
    return regulation;
  }

  async findPublishedBySeasonId(seasonId: string): Promise<Regulation | null> {
    // Try to get from cache first
    const cached = await this.getCachedRegulation(seasonId);
    if (cached) {
      return this.mapCacheToRegulation(cached);
    }

    // If not in cache, get from database
    const regulation = await this.regulationRepository.findPublishedBySeasonId(seasonId);
    
    // Cache if found
    if (regulation) {
      await this.cachePublishedRegulation(regulation);
    }
    
    return regulation;
  }

  // Redis cache methods
  private async cachePublishedRegulation(regulation: Regulation): Promise<void> {
    const cacheData: RegulationCacheData = {
      id: regulation.id,
      seasonId: regulation.seasonId,
      status: regulation.status,
      publishedAt: regulation.publishedAt,
      sections: regulation.sections?.map(section => ({
        id: section.id,
        title: section.title,
        markdownContent: section.markdownContent,
        order: section.order,
        updatedAt: section.updatedAt
      })) || [],
      updatedAt: regulation.updatedAt
    };

    const cacheKey = `regulation:season:${regulation.seasonId}`;
    await this.redisService.setData(cacheKey, cacheData, 3600); // Cache for 1 hour
  }

  private async getCachedRegulation(seasonId: string): Promise<RegulationCacheData | null> {
    try {
      const cacheKey = `regulation:season:${seasonId}`;
      return await this.redisService.getData(cacheKey);
    } catch (error) {
      console.error('Error getting cached regulation:', error);
      return null;
    }
  }

  private async clearRegulationCache(seasonId: string): Promise<void> {
    try {
      const cacheKey = `regulation:season:${seasonId}`;
      await this.redisService.deleteData(cacheKey);
    } catch (error) {
      console.error('Error clearing regulation cache:', error);
    }
  }

  private mapCacheToRegulation(cached: RegulationCacheData): Regulation {
    const regulation = new Regulation();
    regulation.id = cached.id;
    regulation.seasonId = cached.seasonId;
    regulation.status = cached.status;
    regulation.publishedAt = cached.publishedAt;
    regulation.updatedAt = cached.updatedAt;
    
    regulation.sections = cached.sections.map(sectionData => {
      const section = new RegulationSection();
      section.id = sectionData.id;
      section.title = sectionData.title;
      section.markdownContent = sectionData.markdownContent;
      section.order = sectionData.order;
      section.updatedAt = sectionData.updatedAt;
      section.regulationId = regulation.id;
      return section;
    });

    return regulation;
  }
} 