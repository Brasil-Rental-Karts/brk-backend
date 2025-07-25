import {
  CreateRaceTrackDto,
  RaceTrackResponseDto,
  UpdateRaceTrackDto,
} from '../dtos/race-track.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { RaceTrack } from '../models/race-track.entity';
import {
  IRaceTrackRepository,
  RaceTrackRepository,
} from '../repositories/race-track.repository';
import {
  validateDefaultFleets,
  validateTrackLayouts,
} from '../types/race-track.types';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';

export class RaceTrackService extends BaseService<RaceTrack> {
  private readonly raceTrackRepository: IRaceTrackRepository;
  private readonly redisService = RedisService.getInstance();

  constructor(raceTrackRepository: RaceTrackRepository) {
    super(raceTrackRepository);
    this.raceTrackRepository = raceTrackRepository;
  }

  async create(createDto: CreateRaceTrackDto): Promise<RaceTrackResponseDto> {
    // Validar dados customizados
    let trackLayoutErrors: string[] = [];
    let fleetErrors: string[] = [];

    // Verificar se o método existe antes de chamá-lo
    if (typeof createDto.validateTrackLayouts === 'function') {
      trackLayoutErrors = createDto.validateTrackLayouts();
    } else {
      // Usar a função de validação diretamente
      trackLayoutErrors = validateTrackLayouts(createDto.trackLayouts);
    }

    if (typeof createDto.validateDefaultFleets === 'function') {
      fleetErrors = createDto.validateDefaultFleets();
    } else {
      // Usar a função de validação diretamente
      fleetErrors = validateDefaultFleets(createDto.defaultFleets);
    }

    if (trackLayoutErrors.length > 0 || fleetErrors.length > 0) {
      const errors = [...trackLayoutErrors, ...fleetErrors];
      throw new BadRequestException(errors.join(', '));
    }

    // Verificar se já existe um kartódromo com o mesmo nome
    const existingRaceTrack = await this.raceTrackRepository.findByName(
      createDto.name
    );
    if (existingRaceTrack) {
      throw new BadRequestException('Já existe um kartódromo com este nome');
    }

    const raceTrack = await this.raceTrackRepository.create(createDto);
    // Cache no Redis
    await this.redisService.cacheRaceTrackBasicInfo(raceTrack.id, raceTrack);
    return this.mapToResponseDto(raceTrack);
  }

  async findAll(): Promise<RaceTrackResponseDto[]> {
    const raceTracks = await this.raceTrackRepository.findAll();
    return raceTracks.map(raceTrack => this.mapToResponseDto(raceTrack));
  }

  async findActive(): Promise<RaceTrackResponseDto[]> {
    const raceTracks = await this.raceTrackRepository.findActive();
    return raceTracks.map(raceTrack => this.mapToResponseDto(raceTrack));
  }

  async findById(id: string): Promise<RaceTrackResponseDto> {
    const raceTrack = await this.raceTrackRepository.findById(id);
    if (!raceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }
    return this.mapToResponseDto(raceTrack);
  }

  async findByName(name: string): Promise<RaceTrackResponseDto | null> {
    const raceTrack = await this.raceTrackRepository.findByName(name);
    return raceTrack ? this.mapToResponseDto(raceTrack) : null;
  }

  async findByCity(city: string): Promise<RaceTrackResponseDto[]> {
    const raceTracks = await this.raceTrackRepository.findByCity(city);
    return raceTracks.map(raceTrack => this.mapToResponseDto(raceTrack));
  }

  async findByState(state: string): Promise<RaceTrackResponseDto[]> {
    const raceTracks = await this.raceTrackRepository.findByState(state);
    return raceTracks.map(raceTrack => this.mapToResponseDto(raceTrack));
  }

  async update(
    id: string,
    updateDto: UpdateRaceTrackDto
  ): Promise<RaceTrackResponseDto> {
    // Verificar se o kartódromo existe
    const existingRaceTrack = await this.raceTrackRepository.findById(id);
    if (!existingRaceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }

    // Validar dados customizados apenas se estiverem presentes
    let trackLayoutErrors: string[] = [];
    let fleetErrors: string[] = [];

    if (updateDto.trackLayouts) {
      // Verificar se o método existe antes de chamá-lo
      if (typeof updateDto.validateTrackLayouts === 'function') {
        trackLayoutErrors = updateDto.validateTrackLayouts();
      } else {
        // Usar a função de validação diretamente
        trackLayoutErrors = validateTrackLayouts(updateDto.trackLayouts);
      }
    }

    if (updateDto.defaultFleets) {
      // Verificar se o método existe antes de chamá-lo
      if (typeof updateDto.validateDefaultFleets === 'function') {
        fleetErrors = updateDto.validateDefaultFleets();
      } else {
        // Usar a função de validação diretamente
        fleetErrors = validateDefaultFleets(updateDto.defaultFleets);
      }
    }

    if (trackLayoutErrors.length > 0 || fleetErrors.length > 0) {
      const errors = [...trackLayoutErrors, ...fleetErrors];
      throw new BadRequestException(errors.join(', '));
    }

    // Verificar se já existe outro kartódromo com o mesmo nome (exceto o atual)
    if (updateDto.name && updateDto.name !== existingRaceTrack.name) {
      const raceTrackWithSameName = await this.raceTrackRepository.findByName(
        updateDto.name
      );
      if (raceTrackWithSameName && raceTrackWithSameName.id !== id) {
        throw new BadRequestException('Já existe um kartódromo com este nome');
      }
    }

    const updatedRaceTrack = await this.raceTrackRepository.update(
      id,
      updateDto
    );
    if (!updatedRaceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }

    // Atualizar cache no Redis
    await this.redisService.cacheRaceTrackBasicInfo(
      updatedRaceTrack.id,
      updatedRaceTrack
    );
    return this.mapToResponseDto(updatedRaceTrack);
  }

  async delete(id: string): Promise<boolean> {
    // Verificar se o kartódromo existe
    const existingRaceTrack = await this.raceTrackRepository.findById(id);
    if (!existingRaceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }

    const deleted = await this.raceTrackRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Erro ao excluir kartódromo');
    }

    // Remover do cache do Redis
    await this.redisService.invalidateRaceTrackCache(id);
    return deleted;
  }

  async toggleActive(id: string): Promise<RaceTrackResponseDto> {
    const raceTrack = await this.raceTrackRepository.findById(id);
    if (!raceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }

    const updatedRaceTrack = await this.raceTrackRepository.update(id, {
      isActive: !raceTrack.isActive,
    });

    if (!updatedRaceTrack) {
      throw new NotFoundException('Kartódromo não encontrado');
    }

    return this.mapToResponseDto(updatedRaceTrack);
  }

  private mapToResponseDto(raceTrack: RaceTrack): RaceTrackResponseDto {
    return {
      id: raceTrack.id,
      name: raceTrack.name,
      city: raceTrack.city,
      state: raceTrack.state,
      address: raceTrack.address,
      trackLayouts: raceTrack.trackLayouts,
      defaultFleets: raceTrack.defaultFleets,
      generalInfo: raceTrack.generalInfo,
      isActive: raceTrack.isActive,
      createdAt: raceTrack.createdAt,
      updatedAt: raceTrack.updatedAt,
    };
  }
}
