import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database.config';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ScoringSystem } from '../models/scoring-system.entity';

export interface CreateScoringSystemDto {
  name: string;
  positions: Array<{ position: number; points: number }>;
  polePositionPoints?: number;
  fastestLapPoints?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateScoringSystemDto {
  name?: string;
  positions?: Array<{ position: number; points: number }>;
  polePositionPoints?: number;
  fastestLapPoints?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

export class ScoringSystemService {
  private scoringSystemRepository: Repository<ScoringSystem>;

  constructor() {
    this.scoringSystemRepository = AppDataSource.getRepository(ScoringSystem);
  }

  /**
   * Buscar todos os sistemas de pontuação de um campeonato
   */
  async findByChampionship(championshipId: string): Promise<ScoringSystem[]> {
    return this.scoringSystemRepository.find({
      where: { championshipId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Buscar sistema de pontuação por ID
   */
  async findById(id: string, championshipId: string): Promise<ScoringSystem> {
    const scoringSystem = await this.scoringSystemRepository.findOne({
      where: { id, championshipId },
    });

    if (!scoringSystem) {
      throw new NotFoundException('Sistema de pontuação não encontrado');
    }

    return scoringSystem;
  }

  /**
   * Criar novo sistema de pontuação
   */
  async create(
    championshipId: string,
    data: CreateScoringSystemDto
  ): Promise<ScoringSystem> {
    // Validar posições
    this.validatePositions(data.positions);

    // Se está sendo definido como padrão, remover padrão dos outros
    if (data.isDefault) {
      await this.removeDefaultFromOthers(championshipId);
    }

    const scoringSystem = this.scoringSystemRepository.create({
      ...data,
      championshipId,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isDefault: data.isDefault || false,
      polePositionPoints: data.polePositionPoints || 0,
      fastestLapPoints: data.fastestLapPoints || 0,
    });

    return this.scoringSystemRepository.save(scoringSystem);
  }

  /**
   * Atualizar sistema de pontuação
   */
  async update(
    id: string,
    championshipId: string,
    data: UpdateScoringSystemDto
  ): Promise<ScoringSystem> {
    const scoringSystem = await this.findById(id, championshipId);

    // Validar posições se fornecidas
    if (data.positions) {
      this.validatePositions(data.positions);
    }

    // Se está sendo definido como padrão, remover padrão dos outros
    if (data.isDefault && !scoringSystem.isDefault) {
      await this.removeDefaultFromOthers(championshipId);
    }

    Object.assign(scoringSystem, data);
    return this.scoringSystemRepository.save(scoringSystem);
  }

  /**
   * Excluir sistema de pontuação
   */
  async delete(id: string, championshipId: string): Promise<void> {
    const scoringSystem = await this.findById(id, championshipId);

    // Verificar se não é o único sistema de pontuação
    const totalCount = await this.scoringSystemRepository.count({
      where: { championshipId },
    });

    if (totalCount <= 1) {
      throw new BadRequestException(
        'Não é possível excluir o único sistema de pontuação. Pelo menos um sistema deve existir.'
      );
    }

    // Não permitir excluir se for o único sistema ativo
    const activeCount = await this.scoringSystemRepository.count({
      where: { championshipId, isActive: true },
    });

    if (scoringSystem.isActive && activeCount <= 1) {
      throw new BadRequestException(
        'Não é possível excluir o último sistema de pontuação ativo'
      );
    }

    await this.scoringSystemRepository.remove(scoringSystem);
  }

  /**
   * Definir sistema de pontuação como padrão
   */
  async setAsDefault(
    id: string,
    championshipId: string
  ): Promise<ScoringSystem> {
    const scoringSystem = await this.findById(id, championshipId);

    if (!scoringSystem.isActive) {
      throw new BadRequestException(
        'Não é possível definir um sistema de pontuação inativo como padrão'
      );
    }

    // Remover padrão dos outros
    await this.removeDefaultFromOthers(championshipId);

    scoringSystem.isDefault = true;
    return this.scoringSystemRepository.save(scoringSystem);
  }

  /**
   * Alternar status ativo/inativo
   */
  async toggleActive(
    id: string,
    championshipId: string
  ): Promise<ScoringSystem> {
    const scoringSystem = await this.findById(id, championshipId);

    // Se está desativando, verificar se não é o último ativo
    if (scoringSystem.isActive) {
      const activeCount = await this.scoringSystemRepository.count({
        where: { championshipId, isActive: true },
      });

      if (activeCount <= 1) {
        throw new BadRequestException(
          'Não é possível desativar o último sistema de pontuação ativo'
        );
      }

      // Se era padrão, definir outro como padrão
      if (scoringSystem.isDefault) {
        const otherActive = await this.scoringSystemRepository
          .createQueryBuilder('scoringSystem')
          .where('scoringSystem.championshipId = :championshipId', {
            championshipId,
          })
          .andWhere('scoringSystem.isActive = :isActive', { isActive: true })
          .andWhere('scoringSystem.id != :id', { id })
          .getOne();

        if (otherActive) {
          otherActive.isDefault = true;
          await this.scoringSystemRepository.save(otherActive);
        }
      }
    }

    scoringSystem.isActive = !scoringSystem.isActive;

    // Se estava inativo e agora está ativo, e não há padrão, definir como padrão
    if (scoringSystem.isActive) {
      const hasDefault = await this.scoringSystemRepository.findOne({
        where: { championshipId, isDefault: true, isActive: true },
      });

      if (!hasDefault) {
        scoringSystem.isDefault = true;
      }
    } else {
      scoringSystem.isDefault = false;
    }

    return this.scoringSystemRepository.save(scoringSystem);
  }

  /**
   * Criar sistemas de pontuação pré-configurados
   */
  async createPredefined(championshipId: string): Promise<ScoringSystem[]> {
    const existingCount = await this.scoringSystemRepository.count({
      where: { championshipId },
    });

    // Se já tem sistemas, não criar predefinidos
    if (existingCount > 0) {
      return [];
    }

    const predefinedSystems = [
      {
        name: 'Kart Brasileiro',
        positions: [
          { position: 1, points: 20 },
          { position: 2, points: 17 },
          { position: 3, points: 15 },
          { position: 4, points: 13 },
          { position: 5, points: 11 },
          { position: 6, points: 10 },
          { position: 7, points: 9 },
          { position: 8, points: 8 },
          { position: 9, points: 7 },
          { position: 10, points: 6 },
          { position: 11, points: 5 },
          { position: 12, points: 4 },
          { position: 13, points: 3 },
          { position: 14, points: 2 },
          { position: 15, points: 1 },
        ],
        polePositionPoints: 0,
        fastestLapPoints: 0,
        isDefault: true,
      },
    ];

    const scoringSystems = predefinedSystems.map(data =>
      this.scoringSystemRepository.create({
        ...data,
        championshipId,
        isActive: true, // Sempre ativo por padrão
      })
    );

    return this.scoringSystemRepository.save(scoringSystems);
  }

  /**
   * Validar estrutura das posições
   */
  private validatePositions(
    positions: Array<{ position: number; points: number }>
  ): void {
    if (!positions || positions.length === 0) {
      throw new BadRequestException(
        'Pelo menos uma posição deve ser configurada'
      );
    }

    // Verificar se todas as posições têm posição e pontos
    for (const pos of positions) {
      if (typeof pos.position !== 'number' || pos.position < 1) {
        throw new BadRequestException('Posição deve ser um número maior que 0');
      }
      if (typeof pos.points !== 'number' || pos.points < 0) {
        throw new BadRequestException(
          'Pontos devem ser um número maior ou igual a 0'
        );
      }
    }

    // Verificar se não há posições duplicadas
    const positionNumbers = positions.map(p => p.position);
    const uniquePositions = new Set(positionNumbers);
    if (positionNumbers.length !== uniquePositions.size) {
      throw new BadRequestException('Não pode haver posições duplicadas');
    }

    // Ordenar por posição para validar sequência
    const sortedPositions = [...positions].sort(
      (a, b) => a.position - b.position
    );

    // Verificar se as posições começam em 1 e são sequenciais
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i].position !== i + 1) {
        throw new BadRequestException(
          'As posições devem ser sequenciais começando em 1'
        );
      }
    }
  }

  /**
   * Remover padrão de outros sistemas do campeonato
   */
  private async removeDefaultFromOthers(championshipId: string): Promise<void> {
    await this.scoringSystemRepository
      .createQueryBuilder()
      .update(ScoringSystem)
      .set({ isDefault: false })
      .where('championshipId = :championshipId', { championshipId })
      .execute();
  }
}
