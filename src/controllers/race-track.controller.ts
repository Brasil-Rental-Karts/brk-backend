import { NextFunction, Request, Response } from 'express';

import { CreateRaceTrackDto, UpdateRaceTrackDto } from '../dtos/race-track.dto';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { UserRole } from '../models/user.entity';
import { RaceTrackService } from '../services/race-track.service';
import { BaseController } from './base.controller';

export class RaceTrackController extends BaseController {
  constructor(private raceTrackService: RaceTrackService) {
    super('/race-tracks');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    // Rotas públicas
    this.router.get('/', this.getAllRaceTracks.bind(this));
    this.router.get('/active', this.getActiveRaceTracks.bind(this));
    this.router.get('/:id', this.getRaceTrackById.bind(this));
    this.router.get('/name/:name', this.getRaceTrackByName.bind(this));
    this.router.get('/city/:city', this.getRaceTracksByCity.bind(this));
    this.router.get('/state/:state', this.getRaceTracksByState.bind(this));

    // Rotas protegidas (apenas administradores)
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      validationMiddleware(CreateRaceTrackDto),
      this.createRaceTrack.bind(this)
    );

    this.router.put(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      validationMiddleware(UpdateRaceTrackDto),
      this.updateRaceTrack.bind(this)
    );

    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.deleteRaceTrack.bind(this)
    );

    this.router.patch(
      '/:id/toggle-active',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.toggleRaceTrackActive.bind(this)
    );
  }

  private async createRaceTrack(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const createDto = req.body as CreateRaceTrackDto;
      const raceTrack = await this.raceTrackService.create(createDto);

      res.status(201).json({
        success: true,
        message: 'Kartódromo criado com sucesso',
        data: raceTrack,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getAllRaceTracks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const raceTracks = await this.raceTrackService.findAll();
      res.json({
        success: true,
        message: 'Kartódromos listados com sucesso',
        data: raceTracks,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getActiveRaceTracks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const raceTracks = await this.raceTrackService.findActive();
      res.json({
        success: true,
        message: 'Kartódromos ativos listados com sucesso',
        data: raceTracks,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getRaceTrackById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const raceTrack = await this.raceTrackService.findById(id);
      res.json({
        success: true,
        message: 'Kartódromo encontrado com sucesso',
        data: raceTrack,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getRaceTrackByName(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name } = req.params;
      const raceTrack = await this.raceTrackService.findByName(name);

      if (!raceTrack) {
        res.status(404).json({
          success: false,
          message: 'Kartódromo não encontrado',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Kartódromo encontrado com sucesso',
        data: raceTrack,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getRaceTracksByCity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { city } = req.params;
      const raceTracks = await this.raceTrackService.findByCity(city);
      res.json({
        success: true,
        message: 'Kartódromos da cidade listados com sucesso',
        data: raceTracks,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async getRaceTracksByState(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { state } = req.params;
      const raceTracks = await this.raceTrackService.findByState(state);
      res.json({
        success: true,
        message: 'Kartódromos do estado listados com sucesso',
        data: raceTracks,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async updateRaceTrack(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updateDto = req.body as UpdateRaceTrackDto;
      const raceTrack = await this.raceTrackService.update(id, updateDto);

      res.json({
        success: true,
        message: 'Kartódromo atualizado com sucesso',
        data: raceTrack,
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async deleteRaceTrack(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await this.raceTrackService.delete(id);
      res.json({
        success: true,
        message: 'Kartódromo excluído com sucesso',
      });
    } catch (error: any) {
      next(error);
    }
  }

  private async toggleRaceTrackActive(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const raceTrack = await this.raceTrackService.toggleActive(id);

      const message = raceTrack.isActive
        ? 'Kartódromo ativado com sucesso'
        : 'Kartódromo desativado com sucesso';

      res.json({
        success: true,
        message,
        data: raceTrack,
      });
    } catch (error: any) {
      next(error);
    }
  }
}
