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

  async createWithSections(
    regulationData: { 
      seasonId: string;
      sections?: Array<{ title: string; markdownContent: string; order: number; }>;
    }
  ): Promise<RegulationWithSections> {
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      const regulationRepository = transactionalEntityManager.getRepository(Regulation);
      const sectionRepository = transactionalEntityManager.getRepository(RegulationSection);

      // Create and save the main regulation
      const regulation = regulationRepository.create({
        seasonId: regulationData.seasonId,
        status: RegulationStatus.DRAFT
      });
      const savedRegulation = await regulationRepository.save(regulation);

      // Create and save sections if they exist
      let savedSections: RegulationSection[] = [];
      if (regulationData.sections && regulationData.sections.length > 0) {
        const sections = regulationData.sections.map(sectionData => 
          sectionRepository.create({
            ...sectionData,
            regulation: savedRegulation
          })
        );
        savedSections = await sectionRepository.save(sections);
      }
      
      savedRegulation.sections = savedSections;

      // Publish database change event
      await this.databaseEventsService.onEntityChange('INSERT', 'Regulation', {
        id: savedRegulation.id,
        status: savedRegulation.status,
        seasonId: savedRegulation.seasonId,
        sectionsCount: savedSections.length
      });

      return {
        id: savedRegulation.id,
        status: savedRegulation.status,
        seasonId: savedRegulation.seasonId,
        publishedAt: savedRegulation.publishedAt,
        sections: savedSections.map(s => ({
          id: s.id,
          title: s.title,
          markdownContent: s.markdownContent,
          order: s.order
        }))
      };
    });
  }

  async updateWithSections(
    id: string, 
    regulationData: { 
      status?: RegulationStatus;
      sections?: Array<{ id?: string; title: string; markdownContent: string; order: number; }>;
    }
  ): Promise<RegulationWithSections | null> {
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      const regulationRepository = transactionalEntityManager.getRepository(Regulation);
      const sectionRepository = transactionalEntityManager.getRepository(RegulationSection);

      const regulation = await regulationRepository.findOne({
        where: { id },
        relations: ['sections'],
      });

      if (!regulation) {
        return null;
      }

      // Update regulation properties (e.g., status)
      if (regulationData.status) {
        regulation.status = regulationData.status;
      }

      // Sync sections
      if (regulationData.sections) {
        const existingSections = regulation.sections || [];
        const incomingSectionsData = regulationData.sections;

        // Determine which sections to delete
        const sectionsToDelete = existingSections.filter(
          (existing) => !incomingSectionsData.some((incoming) => incoming.id === existing.id)
        );
        
        if (sectionsToDelete.length > 0) {
          await sectionRepository.remove(sectionsToDelete);
        }

        // Upsert (update or insert) sections
        const sectionsToUpsert = await Promise.all(
          incomingSectionsData.map(async (sectionData) => {
            if (sectionData.id) {
              // If it has an ID, it's an update
              await sectionRepository.update(sectionData.id, sectionData);
              // After update, find it to get the full entity
              return sectionRepository.findOneByOrFail({ id: sectionData.id });
            } else {
              // If it has no ID, it's a new section
              const newSection = sectionRepository.create({
                ...sectionData,
                regulation: regulation,
              });
              return sectionRepository.save(newSection);
            }
          })
        );
        
        regulation.sections = sectionsToUpsert;
      }

      const updatedRegulation = await regulationRepository.save(regulation);
      
      // Publish database change event
      await this.databaseEventsService.onEntityChange('UPDATE', 'Regulation', {
        id: updatedRegulation.id,
        status: updatedRegulation.status,
        sectionsUpdated: true,
        sectionsCount: updatedRegulation.sections.length
      });

      // Sort sections for a consistent response
      const sortedSections = (updatedRegulation.sections || []).sort((a, b) => a.order - b.order);

      return {
        id: updatedRegulation.id,
        status: updatedRegulation.status,
        seasonId: updatedRegulation.seasonId,
        publishedAt: updatedRegulation.publishedAt,
        sections: sortedSections.map(s => ({
          id: s.id,
          title: s.title,
          markdownContent: s.markdownContent,
          order: s.order
        }))
      };
    });
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