import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database.config';
import { CreateGridTypeDto, UpdateGridTypeDto } from '../dtos/grid-type.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { GridType, GridTypeEnum } from '../models/grid-type.entity';

export class GridTypeService {
  private gridTypeRepository: Repository<GridType>;

  constructor() {
    this.gridTypeRepository = AppDataSource.getRepository(GridType);
  }

  /**
   * Buscar todos os tipos de grid de um campeonato
   */
  async findByChampionship(championshipId: string): Promise<GridType[]> {
    return this.gridTypeRepository.find({
      where: { championshipId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Buscar tipo de grid por ID
   */
  async findById(id: string, championshipId: string): Promise<GridType> {
    const gridType = await this.gridTypeRepository.findOne({
      where: { id, championshipId },
    });

    if (!gridType) {
      throw new NotFoundException('Tipo de grid não encontrado');
    }

    return gridType;
  }

  /**
   * Criar novo tipo de grid
   */
  async create(
    championshipId: string,
    data: CreateGridTypeDto
  ): Promise<GridType> {
    // Validar se tipo inverted_partial tem invertedPositions
    if (
      data.type === GridTypeEnum.INVERTED_PARTIAL &&
      !data.invertedPositions
    ) {
      throw new BadRequestException(
        'Número de posições invertidas é obrigatório para tipo inverted_partial'
      );
    }

    // Validar se tipo qualifying_session tem qualifyingDuration
    if (
      data.type === GridTypeEnum.QUALIFYING_SESSION &&
      !data.qualifyingDuration
    ) {
      throw new BadRequestException(
        'Duração da classificação é obrigatória para tipo qualifying_session'
      );
    }

    // Se está sendo definido como padrão, remover padrão dos outros
    if (data.isDefault) {
      await this.removeDefaultFromOthers(championshipId);
    }

    const gridType = this.gridTypeRepository.create({
      ...data,
      championshipId,
    });

    return this.gridTypeRepository.save(gridType);
  }

  /**
   * Atualizar tipo de grid
   */
  async update(
    id: string,
    championshipId: string,
    data: UpdateGridTypeDto
  ): Promise<GridType> {
    const gridType = await this.findById(id, championshipId);

    // Validar se tipo inverted_partial tem invertedPositions
    const newType = data.type || gridType.type;
    if (newType === GridTypeEnum.INVERTED_PARTIAL) {
      const newInvertedPositions =
        data.invertedPositions !== undefined
          ? data.invertedPositions
          : gridType.invertedPositions;
      if (!newInvertedPositions) {
        throw new BadRequestException(
          'Número de posições invertidas é obrigatório para tipo inverted_partial'
        );
      }
    }

    // Validar se tipo qualifying_session tem qualifyingDuration
    if (newType === GridTypeEnum.QUALIFYING_SESSION) {
      const newQualifyingDuration =
        data.qualifyingDuration !== undefined
          ? data.qualifyingDuration
          : gridType.qualifyingDuration;
      if (!newQualifyingDuration) {
        throw new BadRequestException(
          'Duração da classificação é obrigatória para tipo qualifying_session'
        );
      }
    }

    // Se está sendo definido como padrão, remover padrão dos outros
    if (data.isDefault && !gridType.isDefault) {
      await this.removeDefaultFromOthers(championshipId);
    }

    Object.assign(gridType, data);
    return this.gridTypeRepository.save(gridType);
  }

  /**
   * Excluir tipo de grid
   */
  async delete(id: string, championshipId: string): Promise<void> {
    const gridType = await this.findById(id, championshipId);

    // Verificar se não é o único tipo de grid total
    const totalCount = await this.gridTypeRepository.count({
      where: { championshipId },
    });

    if (totalCount <= 1) {
      throw new BadRequestException(
        'Não é possível excluir o único tipo de grid. Pelo menos um tipo deve existir.'
      );
    }

    // Não permitir excluir se for o único tipo ativo
    const activeCount = await this.gridTypeRepository.count({
      where: { championshipId, isActive: true },
    });

    if (gridType.isActive && activeCount <= 1) {
      throw new BadRequestException(
        'Não é possível excluir o último tipo de grid ativo'
      );
    }

    await this.gridTypeRepository.remove(gridType);
  }

  /**
   * Definir tipo de grid como padrão
   */
  async setAsDefault(id: string, championshipId: string): Promise<GridType> {
    const gridType = await this.findById(id, championshipId);

    if (!gridType.isActive) {
      throw new BadRequestException(
        'Não é possível definir um tipo de grid inativo como padrão'
      );
    }

    // Remover padrão dos outros
    await this.removeDefaultFromOthers(championshipId);

    gridType.isDefault = true;
    return this.gridTypeRepository.save(gridType);
  }

  /**
   * Alternar status ativo/inativo
   */
  async toggleActive(id: string, championshipId: string): Promise<GridType> {
    const gridType = await this.findById(id, championshipId);

    // Se está desativando, verificar se não é o último ativo
    if (gridType.isActive) {
      const activeCount = await this.gridTypeRepository.count({
        where: { championshipId, isActive: true },
      });

      if (activeCount <= 1) {
        throw new BadRequestException(
          'Não é possível desativar o último tipo de grid ativo'
        );
      }

      // Se era padrão, definir outro como padrão
      if (gridType.isDefault) {
        const otherActive = await this.gridTypeRepository
          .createQueryBuilder('gridType')
          .where('gridType.championshipId = :championshipId', {
            championshipId,
          })
          .andWhere('gridType.isActive = :isActive', { isActive: true })
          .andWhere('gridType.id != :id', { id })
          .getOne();

        if (otherActive) {
          otherActive.isDefault = true;
          await this.gridTypeRepository.save(otherActive);
        }
      }
    }

    gridType.isActive = !gridType.isActive;

    // Se estava inativo e agora está ativo, e não há padrão, definir como padrão
    if (gridType.isActive) {
      const hasDefault = await this.gridTypeRepository.findOne({
        where: { championshipId, isDefault: true, isActive: true },
      });

      if (!hasDefault) {
        gridType.isDefault = true;
      }
    } else {
      gridType.isDefault = false;
    }

    return this.gridTypeRepository.save(gridType);
  }

  /**
   * Criar tipos de grid pré-configurados
   */
  async createPredefined(championshipId: string): Promise<GridType[]> {
    const existingCount = await this.gridTypeRepository.count({
      where: { championshipId },
    });

    if (existingCount > 0) {
      throw new BadRequestException(
        'Já existem tipos de grid configurados para este campeonato'
      );
    }

    const predefinedTypes = [
      {
        name: 'Super Pole',
        description:
          'A volta mais rápida da classificação define a ordem de largada',
        type: GridTypeEnum.SUPER_POLE,
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Invertido',
        description:
          'Posições de largada são definidas pelo resultado da bateria anterior de forma invertida',
        type: GridTypeEnum.INVERTED,
        isActive: true,
        isDefault: false,
      },
      {
        name: 'Invertido + 10',
        description:
          'Somente os 10 primeiros colocados da bateria anterior invertem suas posições',
        type: GridTypeEnum.INVERTED_PARTIAL,
        isActive: true,
        isDefault: false,
        invertedPositions: 10,
      },
      {
        name: 'Classificação 5min',
        description:
          'Sessão de classificação por tempo determinado. Posições definidas pela volta mais rápida durante a sessão',
        type: GridTypeEnum.QUALIFYING_SESSION,
        isActive: true,
        isDefault: false,
        qualifyingDuration: 5,
      },
    ];

    const gridTypes = predefinedTypes.map(data =>
      this.gridTypeRepository.create({ ...data, championshipId })
    );

    return this.gridTypeRepository.save(gridTypes);
  }

  /**
   * Remover padrão de todos os outros tipos de grid
   */
  private async removeDefaultFromOthers(championshipId: string): Promise<void> {
    await this.gridTypeRepository.update(
      { championshipId, isDefault: true },
      { isDefault: false }
    );
  }
}
