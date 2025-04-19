import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Result } from '../models/result.entity';
import { ResultRepository } from '../repositories/result.repository';
import { HttpException } from '../middleware/error.middleware';

export class ResultService extends BaseService<Result> {
  constructor(private resultRepository: ResultRepository) {
    super(resultRepository);
  }
  
  async findByHeatId(heatId: string): Promise<Result[]> {
    const results = await this.findAll();
    return results.filter(result => result.heat && result.heat.id === heatId);
  }
  
  async findByPilotId(pilotId: string): Promise<Result[]> {
    const results = await this.findAll();
    return results.filter(result => result.pilot && result.pilot.id === pilotId);
  }

  async findAll(): Promise<Result[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Result | null> {
    return super.findById(id);
  }

  async create(resultData: DeepPartial<Result>): Promise<Result> {
    return super.create(resultData);
  }

  async update(id: string, resultData: DeepPartial<Result>): Promise<Result | null> {
    return super.update(id, resultData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
  
  async recalculatePositions(heatId: string): Promise<Result[]> {
    // Get all results for the heat
    const results = await this.findByHeatId(heatId);
    
    if (!results || results.length === 0) {
      return [];
    }
    
    // Sort results by lap time (ascending)
    const sortedResults = [...results].sort((a, b) => {
      // Handle disqualified pilots
      if (a.disqualified && !b.disqualified) return 1;
      if (!a.disqualified && b.disqualified) return -1;
      if (a.disqualified && b.disqualified) return 0;
      
      // Extract milliseconds from lap time
      const aTime = this.parseTimeToMs(a.lapTime);
      const bTime = this.parseTimeToMs(b.lapTime);
      
      return aTime - bTime;
    });
    
    // Assign positions
    let position = 1;
    for (const result of sortedResults) {
      if (result.disqualified) {
        result.position = 0; // Disqualified pilots get position 0
      } else {
        result.position = position++;
      }
      
      // Update result in database
      await this.update(result.id, { position: result.position });
    }
    
    return sortedResults;
  }
  
  // Helper method to convert 'HH:MM:SS.mmm' string to milliseconds
  private parseTimeToMs(timeString?: string): number {
    if (!timeString) return Number.MAX_SAFE_INTEGER; // No time = worst time
    
    // Parse PostgreSQL interval format (approximation)
    const matches = timeString.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
    if (!matches) return Number.MAX_SAFE_INTEGER;
    
    const hours = parseInt(matches[1] || '0');
    const minutes = parseInt(matches[2] || '0');
    const seconds = parseInt(matches[3] || '0');
    const milliseconds = parseInt(matches[4] || '0');
    
    return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
  }
  
  async calculatePoints(heatId: string, pointsSystem: number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]): Promise<Result[]> {
    // First ensure positions are up to date
    const results = await this.recalculatePositions(heatId);
    
    // Calculate points
    for (const result of results) {
      if (result.disqualified) {
        result.points = 0;
      } else if (result.position <= pointsSystem.length) {
        result.points = pointsSystem[result.position - 1];
      } else {
        result.points = 0; // No points for positions beyond the points system
      }
      
      // Update result in database
      await this.update(result.id, { points: result.points });
    }
    
    return results;
  }
  
  async disqualifyPilot(resultId: string, reason: string): Promise<Result | null> {
    // Get the result
    const result = await this.findById(resultId);
    if (!result) {
      throw new HttpException(404, 'Result not found');
    }
    
    // Set disqualified flag and update notes
    result.disqualified = true;
    result.points = 0;
    
    if (!result.notes) {
      result.notes = `Disqualified: ${reason}`;
    } else {
      result.notes += `\nDisqualified: ${reason}`;
    }
    
    // Update the result
    return this.update(resultId, { 
      disqualified: true, 
      points: 0, 
      notes: result.notes 
    });
  }
  
  async getStandingsByCategory(categoryId: string): Promise<any[]> {
    // This would require complex joins to get all results for pilots in a category
    // across multiple heats and stages. A database query would be more appropriate.
    // For now, we'll return a simplified implementation.
    
    // Placeholder for the complex calculation
    return []; 
  }
} 