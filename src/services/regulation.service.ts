import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Regulation, RegulationStatus } from '../models/regulation.entity';
import { RegulationSection } from '../models/regulation-section.entity';
import { RegulationRepository } from '../repositories/regulation.repository';
import { DatabaseChangeEventsService } from './database-change-events.service';

export interface RegulationWithSections {
  id: string;
  status: string;
  seasonId: string;
  publishedAt: Date | null;
  sections: Array<{
    id: string;
    title: string;
    markdownContent: string;
    order: number;
  }>;
}

export class RegulationService {
  private regulationRepository: RegulationRepository;
  private repository: Repository<Regulation>;
  private sectionRepository: Repository<RegulationSection>;
  private databaseEventsService: DatabaseChangeEventsService;

  constructor(regulationRepository: RegulationRepository) {
    this.regulationRepository = regulationRepository;
    this.repository = AppDataSource.getRepository(Regulation);
    this.sectionRepository = AppDataSource.getRepository(RegulationSection);
    this.databaseEventsService = DatabaseChangeEventsService.getInstance();
  }

  async create(regulationData: Partial<Regulation>): Promise<Regulation> {
    const regulation = this.repository.create(regulationData);
    const savedRegulation = await this.repository.save(regulation);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('INSERT', 'Regulation', {
      id: savedRegulation.id,
      status: savedRegulation.status,
      seasonId: savedRegulation.seasonId
    });
    
    return savedRegulation;
  }

  async findById(id: string): Promise<Regulation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['sections']
    });
  }

  async findByIdWithSections(id: string): Promise<RegulationWithSections | null> {
    const regulation = await this.repository.findOne({
      where: { id },
      relations: ['sections']
    });

    if (!regulation) {
      return null;
    }

    return {
      id: regulation.id,
      status: regulation.status,
      seasonId: regulation.seasonId,
      publishedAt: regulation.publishedAt,
      sections: regulation.sections
        ? regulation.sections
            .sort((a, b) => a.order - b.order)
            .map(section => ({
              id: section.id,
              title: section.title,
              markdownContent: section.markdownContent,
              order: section.order
            }))
        : []
    };
  }

  async findBySeasonId(seasonId: string): Promise<Regulation[]> {
    return this.repository.find({
      where: { seasonId },
      relations: ['sections'],
      order: { createdAt: 'ASC' }
    });
  }

  async findPublishedBySeasonId(seasonId: string): Promise<RegulationWithSections | null> {
    const regulation = await this.repository.findOne({
      where: { 
        seasonId,
        status: RegulationStatus.PUBLISHED
      },
      relations: ['sections'],
      order: { publishedAt: 'DESC' }
    });

    if (!regulation) {
      return null;
    }

    return {
      id: regulation.id,
      status: regulation.status,
      seasonId: regulation.seasonId,
      publishedAt: regulation.publishedAt,
      sections: regulation.sections
        ? regulation.sections
            .sort((a, b) => a.order - b.order)
            .map(section => ({
              id: section.id,
              title: section.title,
              markdownContent: section.markdownContent,
              order: section.order
            }))
        : []
    };
  }

  async findBySeasonIdWithSections(seasonId: string): Promise<RegulationWithSections[]> {
    const regulations = await this.repository.find({
      where: { seasonId },
      relations: ['sections'],
      order: { createdAt: 'ASC' }
    });

    return regulations.map(regulation => ({
      id: regulation.id,
      status: regulation.status,
      seasonId: regulation.seasonId,
      publishedAt: regulation.publishedAt,
      sections: regulation.sections
        ? regulation.sections
            .sort((a, b) => a.order - b.order)
            .map(section => ({
              id: section.id,
              title: section.title,
              markdownContent: section.markdownContent,
              order: section.order
            }))
        : []
    }));
  }

  // Simplified versions of complex methods
  async createWithSections(regulationData: any): Promise<RegulationWithSections> {
    // For now, just create the regulation without sections
    // This can be expanded later when the types are properly resolved
    const regulation = await this.create({
      seasonId: regulationData.seasonId,
      status: RegulationStatus.DRAFT
    });
    
    return {
      id: regulation.id,
      status: regulation.status,
      seasonId: regulation.seasonId,
      publishedAt: regulation.publishedAt,
      sections: []
    };
  }

  async updateWithSections(id: string, regulationData: any): Promise<RegulationWithSections | null> {
    // For now, just update the regulation without sections
    const updatedRegulation = await this.update(id, regulationData);
    
    if (!updatedRegulation) {
      return null;
    }
    
    return {
      id: updatedRegulation.id,
      status: updatedRegulation.status,
      seasonId: updatedRegulation.seasonId,
      publishedAt: updatedRegulation.publishedAt,
      sections: updatedRegulation.sections
        ? updatedRegulation.sections
            .sort((a, b) => a.order - b.order)
            .map(section => ({
              id: section.id,
              title: section.title,
              markdownContent: section.markdownContent,
              order: section.order
            }))
        : []
    };
  }

  async publish(id: string): Promise<RegulationWithSections | null> {
    const regulation = await this.findById(id);
    if (!regulation) {
      return null;
    }

    const updatedRegulation = await this.update(id, {
      status: RegulationStatus.PUBLISHED,
      publishedAt: new Date()
    });
    
    if (!updatedRegulation) {
      return null;
    }
    
    return {
      id: updatedRegulation.id,
      status: updatedRegulation.status,
      seasonId: updatedRegulation.seasonId,
      publishedAt: updatedRegulation.publishedAt,
      sections: updatedRegulation.sections
        ? updatedRegulation.sections
            .sort((a, b) => a.order - b.order)
            .map(section => ({
              id: section.id,
              title: section.title,
              markdownContent: section.markdownContent,
              order: section.order
            }))
        : []
    };
  }

  async reorderSections(regulationId: string, sections: Array<{id: string, order: number}>): Promise<boolean> {
    try {
      for (const sectionData of sections) {
        await this.sectionRepository.update(sectionData.id, { order: sectionData.order });
      }
      
      // Publish database change event
      await this.databaseEventsService.onEntityChange('UPDATE', 'Regulation', {
        id: regulationId,
        sectionsReordered: true,
        sectionsCount: sections.length
      });
      
      return true;
    } catch (error) {
      console.error('Error reordering sections:', error);
      return false;
    }
  }

  async update(id: string, regulationData: Partial<Regulation>): Promise<Regulation | null> {
    const regulation = await this.findById(id);
    if (!regulation) {
      return null;
    }

    Object.assign(regulation, regulationData);
    const updatedRegulation = await this.repository.save(regulation);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('UPDATE', 'Regulation', {
      id: updatedRegulation.id,
      status: updatedRegulation.status,
      seasonId: updatedRegulation.seasonId
    });
    
    return updatedRegulation;
  }

  async delete(id: string): Promise<boolean> {
    const regulation = await this.findById(id);
    if (!regulation) {
      return false;
    }

    const result = await this.repository.delete(id);
    
    if (result.affected && result.affected > 0) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('DELETE', 'Regulation', {
        id: regulation.id,
        status: regulation.status,
        seasonId: regulation.seasonId
      });
      
      return true;
    }
    
    return false;
  }

  async findAll(): Promise<Regulation[]> {
    return this.repository.find({
      relations: ['sections'],
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * Buscar regulamento com cache - agora consulta diretamente o banco
   */
  async findBySeasonIdCached(seasonId: string): Promise<RegulationWithSections[]> {
    // Anteriormente usava cache, agora consulta diretamente
    return this.findBySeasonIdWithSections(seasonId);
  }

  /**
   * Invalidar cache - método legado, agora não faz nada
   */
  async invalidateCache(seasonId: string): Promise<void> {
    // Método legado - não faz mais nada pois não usamos cache
    console.log(`Cache invalidation requested for season ${seasonId} - no action needed with new architecture`);
  }

  /**
   * Método para obter dados básicos do regulamento
   */
  async getRegulationBasicInfo(id: string): Promise<any | null> {
    try {
      const regulation = await this.findById(id);
      
      if (!regulation) {
        return null;
      }
      
      return {
        id: regulation.id,
        status: regulation.status,
        seasonId: regulation.seasonId,
        sectionsCount: regulation.sections?.length || 0
      };
    } catch (error) {
      console.error('Error getting regulation basic info:', error);
      return null;
    }
  }
} 