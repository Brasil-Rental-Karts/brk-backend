import { Request, Response } from 'express';
import { DataSource } from 'typeorm';

import { LapTimesService } from '../services/lap-times.service';
import { BaseController } from './base.controller';

export class LapTimesController extends BaseController {
  private lapTimesService: LapTimesService;

  constructor(dataSource: DataSource) {
    super('/lap-times');
    this.lapTimesService = new LapTimesService(dataSource);
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    // GET /lap-times/stage/:stageId
    this.router.get('/stage/:stageId', this.getLapTimesByStage.bind(this));

    // GET /lap-times/stage/:stageId/category/:categoryId
    this.router.get(
      '/stage/:stageId/category/:categoryId',
      this.getLapTimesByStageAndCategory.bind(this)
    );

    // GET /lap-times/stage/:stageId/category/:categoryId/user/:userId
    this.router.get(
      '/stage/:stageId/category/:categoryId/user/:userId',
      this.getLapTimesByUser.bind(this)
    );

    // POST /lap-times/stage/:stageId/category/:categoryId/user/:userId
    this.router.post(
      '/stage/:stageId/category/:categoryId/user/:userId',
      this.saveLapTimes.bind(this)
    );

    // POST /lap-times/stage/:stageId/category/:categoryId/import
    this.router.post(
      '/stage/:stageId/category/:categoryId/import',
      this.importLapTimesFromExcel.bind(this)
    );

    // DELETE /lap-times/stage/:stageId/category/:categoryId/user/:userId
    this.router.delete(
      '/stage/:stageId/category/:categoryId/user/:userId',
      this.deleteLapTimes.bind(this)
    );

    // DELETE /lap-times/stage/:stageId/category/:categoryId/battery/:batteryIndex
    this.router.delete(
      '/stage/:stageId/category/:categoryId/battery/:batteryIndex',
      this.deleteLapTimesByCategoryAndBattery.bind(this)
    );
  }

  private async getLapTimesByStage(req: Request, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;

      const lapTimes = await this.lapTimesService.getLapTimesByStage(stageId);

      res.status(200).json(lapTimes);
    } catch (error) {
      console.error('Erro ao buscar tempos volta a volta por etapa:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getLapTimesByStageAndCategory(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId, categoryId } = req.params;

      const lapTimes = await this.lapTimesService.getLapTimesByStageAndCategory(
        stageId,
        categoryId
      );

      res.status(200).json(lapTimes);
    } catch (error) {
      console.error(
        'Erro ao buscar tempos volta a volta por etapa e categoria:',
        error
      );
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getLapTimesByUser(req: Request, res: Response): Promise<void> {
    try {
      const { stageId, categoryId, userId } = req.params;
      const { batteryIndex } = req.query;

      const lapTimes = await this.lapTimesService.getLapTimesByUser(
        userId,
        stageId,
        categoryId,
        batteryIndex ? Number(batteryIndex) : undefined
      );

      res.status(200).json(lapTimes);
    } catch (error) {
      console.error('Erro ao buscar tempos volta a volta por usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async saveLapTimes(req: Request, res: Response): Promise<void> {
    try {
      const { stageId, categoryId, userId } = req.params;
      const { batteryIndex, kartNumber, lapTimes } = req.body;

      const savedLapTimes = await this.lapTimesService.saveLapTimes(
        userId,
        stageId,
        categoryId,
        batteryIndex,
        kartNumber,
        lapTimes
      );

      res.status(200).json(savedLapTimes);
    } catch (error) {
      console.error('Erro ao salvar tempos volta a volta:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async importLapTimesFromExcel(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId, categoryId } = req.params;
      const { batteryIndex, excelData, kartToUserMapping } = req.body;

      const result = await this.lapTimesService.importLapTimesFromExcel(
        stageId,
        categoryId,
        batteryIndex,
        excelData,
        kartToUserMapping
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao importar tempos volta a volta:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async deleteLapTimes(req: Request, res: Response): Promise<void> {
    try {
      const { stageId, categoryId, userId } = req.params;
      const { batteryIndex } = req.query;

      await this.lapTimesService.deleteLapTimes(
        userId,
        stageId,
        categoryId,
        batteryIndex ? Number(batteryIndex) : undefined
      );

      res
        .status(200)
        .json({ message: 'Tempos volta a volta deletados com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar tempos volta a volta:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async deleteLapTimesByCategoryAndBattery(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { stageId, categoryId, batteryIndex } = req.params;

      await this.lapTimesService.deleteLapTimesByCategoryAndBattery(
        stageId,
        categoryId,
        Number(batteryIndex)
      );

      res
        .status(200)
        .json({ message: 'Tempos volta a volta deletados com sucesso' });
    } catch (error) {
      console.error(
        'Erro ao deletar tempos volta a volta por categoria e bateria:',
        error
      );
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}
