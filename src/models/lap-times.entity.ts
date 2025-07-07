import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Stage } from './stage.entity';
import { Category } from './category.entity';

export interface LapTime {
  lap: number;
  time: string;
  timeMs: number;
}

@Entity('lap_times')
@Index(['userId', 'stageId', 'categoryId', 'batteryIndex'], { unique: true })
export class LapTimes extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  stageId: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'int', default: 0 })
  batteryIndex: number;

  @Column({ type: 'int' })
  kartNumber: number;

  @Column({ 
    type: 'jsonb',
    comment: 'JSON array with lap times: [{"lap": 1, "time": "01:21.855", "timeMs": 81855}, ...]'
  })
  lapTimes: LapTime[];

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Stage)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // Helper methods
  getBestLapTime(): LapTime | null {
    if (!this.lapTimes || this.lapTimes.length === 0) return null;
    
    return this.lapTimes.reduce((best, current) => 
      current.timeMs < best.timeMs ? current : best
    );
  }

  getAverageLapTime(): number | null {
    if (!this.lapTimes || this.lapTimes.length === 0) return null;
    
    const totalMs = this.lapTimes.reduce((sum, lap) => sum + lap.timeMs, 0);
    return totalMs / this.lapTimes.length;
  }

  getTotalTime(): number {
    if (!this.lapTimes || this.lapTimes.length === 0) return 0;
    
    return this.lapTimes.reduce((sum, lap) => sum + lap.timeMs, 0);
  }
} 