import { Repository, EntityManager } from 'typeorm';
import { Regulation, RegulationStatus } from '../models/regulation.entity';
import { RegulationSection } from '../models/regulation-section.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class RegulationRepository extends BaseRepositoryImpl<Regulation> {
  private regulationSectionRepository: Repository<RegulationSection>;

  constructor(
    repository: Repository<Regulation>,
    regulationSectionRepository: Repository<RegulationSection>
  ) {
    super(repository);
    this.regulationSectionRepository = regulationSectionRepository;
  }

  async findBySeasonId(seasonId: string): Promise<Regulation | null> {
    return this.repository.findOne({
      where: { seasonId },
      relations: ['sections'],
      order: {
        sections: {
          order: 'ASC'
        }
      }
    });
  }

  async findByIdWithSections(id: string): Promise<Regulation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['sections'],
      order: {
        sections: {
          order: 'ASC'
        }
      }
    });
  }

  async createWithSections(
    regulationData: Partial<Regulation>, 
    sectionsData: Partial<RegulationSection>[]
  ): Promise<Regulation> {
    return this.repository.manager.transaction(async (manager: EntityManager) => {
      // Create regulation
      const regulation = manager.create(Regulation, regulationData);
      const savedRegulation = await manager.save(regulation);

      // Create sections with regulation ID
      const sections = sectionsData.map(section => 
        manager.create(RegulationSection, {
          ...section,
          regulationId: savedRegulation.id
        })
      );

      await manager.save(sections);

      // Return regulation with sections
      return this.findByIdWithSections(savedRegulation.id) as Promise<Regulation>;
    });
  }

  async updateWithSections(
    id: string,
    regulationData: Partial<Regulation>,
    sectionsData?: Partial<RegulationSection>[]
  ): Promise<Regulation | null> {
    return this.repository.manager.transaction(async (manager: EntityManager) => {
      // Update regulation
      await manager.update(Regulation, id, regulationData);

      // Update sections if provided
      if (sectionsData) {
        // Delete existing sections
        await manager.delete(RegulationSection, { regulationId: id });

        // Create new sections
        const sections = sectionsData.map(section => 
          manager.create(RegulationSection, {
            ...section,
            regulationId: id
          })
        );

        await manager.save(sections);
      }

      // Return updated regulation with sections
      return this.findByIdWithSections(id);
    });
  }

  async reorderSections(regulationId: string, sectionsOrder: { id: string; order: number }[]): Promise<boolean> {
    return this.repository.manager.transaction(async (manager: EntityManager) => {
      // Update each section's order
      for (const sectionOrder of sectionsOrder) {
        await manager.update(RegulationSection, sectionOrder.id, { 
          order: sectionOrder.order 
        });
      }

      return true;
    });
  }

  async publish(id: string): Promise<Regulation | null> {
    const now = new Date();
    
    await this.repository.update(id, {
      status: RegulationStatus.PUBLISHED,
      publishedAt: now
    });

    return this.findByIdWithSections(id);
  }

  async findPublishedBySeasonId(seasonId: string): Promise<Regulation | null> {
    return this.repository.findOne({
      where: { 
        seasonId,
        status: RegulationStatus.PUBLISHED
      },
      relations: ['sections'],
      order: {
        sections: {
          order: 'ASC'
        }
      }
    });
  }
} 