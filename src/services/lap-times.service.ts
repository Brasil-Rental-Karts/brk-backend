import { DataSource } from 'typeorm';
import { LapTimesRepository } from '../repositories/lap-times.repository';
import { LapTimesRepositoryImpl } from '../repositories/lap-times.repository.impl';
import { LapTimes, LapTime } from '../models/lap-times.entity';

export class LapTimesService {
  private lapTimesRepository: LapTimesRepository;

  constructor(private dataSource: DataSource) {
    this.lapTimesRepository = new LapTimesRepositoryImpl(
      this.dataSource.getRepository(LapTimes)
    );
  }

  async getLapTimesByStage(stageId: string): Promise<LapTimes[]> {
    return this.lapTimesRepository.findByStageId(stageId);
  }

  async getLapTimesByStageAndCategory(stageId: string, categoryId: string): Promise<LapTimes[]> {
    return this.lapTimesRepository.findByStageAndCategory(stageId, categoryId);
  }

  async getLapTimesByUser(
    userId: string, 
    stageId: string, 
    categoryId: string, 
    batteryIndex?: number
  ): Promise<LapTimes | null> {
    return this.lapTimesRepository.findByUserStageCategory(userId, stageId, categoryId, batteryIndex);
  }

  async saveLapTimes(
    userId: string, 
    stageId: string, 
    categoryId: string, 
    batteryIndex: number, 
    kartNumber: number, 
    lapTimes: LapTime[]
  ): Promise<LapTimes> {
    // Validar e converter tempos para milissegundos
    const processedLapTimes = lapTimes.map((lapTime, index) => ({
      ...lapTime,
      lap: lapTime.lap || index + 1,
      timeMs: lapTime.timeMs || this.parseTimeToMs(lapTime.time)
    }));

    return this.lapTimesRepository.saveLapTimes(
      userId, 
      stageId, 
      categoryId, 
      batteryIndex, 
      kartNumber, 
      processedLapTimes
    );
  }

  async importLapTimesFromExcel(
    stageId: string,
    categoryId: string,
    batteryIndex: number,
    excelData: any[],
    kartToUserMapping: { [kartNumber: number]: string }
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Processar dados do Excel
      const kartLapTimes: { [kartNumber: number]: LapTime[] } = {};

      for (const row of excelData) {
        const kartNumber = Number(row.kartNumber);
        const lapNumber = Number(row.lapNumber);
        const lapTime = String(row.lapTime).trim();

        if (isNaN(kartNumber) || isNaN(lapNumber) || !lapTime) {
          continue;
        }

        if (!kartLapTimes[kartNumber]) {
          kartLapTimes[kartNumber] = [];
        }

        const timeMs = this.parseTimeToMs(lapTime);
        if (timeMs > 0) {
          kartLapTimes[kartNumber].push({
            lap: lapNumber,
            time: lapTime,
            timeMs
          });
        }
      }

      // Salvar para cada kart/piloto
      for (const [kartNumber, lapTimes] of Object.entries(kartLapTimes)) {
        const kartNum = Number(kartNumber);
        const userId = kartToUserMapping[kartNum];

        if (!userId) {
          errors.push(`Kart ${kartNum} não encontrado no sorteio`);
          continue;
        }

        // Ordenar voltas por número
        lapTimes.sort((a, b) => a.lap - b.lap);

        await this.saveLapTimes(userId, stageId, categoryId, batteryIndex, kartNum, lapTimes);
        imported++;
      }

      return { imported, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao importar tempos volta a volta: ${errorMessage}`);
    }
  }

  async deleteLapTimes(userId: string, stageId: string, categoryId: string, batteryIndex?: number): Promise<void> {
    return this.lapTimesRepository.deleteLapTimes(userId, stageId, categoryId, batteryIndex);
  }

  async deleteLapTimesByCategoryAndBattery(stageId: string, categoryId: string, batteryIndex: number): Promise<void> {
    return this.lapTimesRepository.deleteLapTimesByCategoryAndBattery(stageId, categoryId, batteryIndex);
  }

  private parseTimeToMs(timeString: string): number {
    try {
      // Formato esperado: MM:SS.sss ou HH:MM:SS.sss
      const parts = timeString.split(':');
      let totalMs = 0;

      if (parts.length === 2) {
        // MM:SS.sss
        const minutes = parseInt(parts[0]);
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0]);
        const milliseconds = parseInt(secondsParts[1]?.padEnd(3, '0').substring(0, 3) || '0');
        
        totalMs = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
      } else if (parts.length === 3) {
        // HH:MM:SS.sss
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const secondsParts = parts[2].split('.');
        const seconds = parseInt(secondsParts[0]);
        const milliseconds = parseInt(secondsParts[1]?.padEnd(3, '0').substring(0, 3) || '0');
        
        totalMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
      }

      return totalMs;
    } catch (error) {
      return 0;
    }
  }

  formatMsToTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
} 