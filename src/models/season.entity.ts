import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Championship } from './championship.entity';
import { Category } from './category.entity';

@Entity('Season')
export class Season extends BaseEntity {
  @ManyToOne(() => Championship, championship => championship.seasons)
  @JoinColumn({ name: 'championship_id' })
  championship: Championship;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ nullable: false })
  year: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ length: 20, nullable: true })
  status: string;

  // Relations
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'Season_Categories',
    joinColumn: { name: 'season_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' }
  })
  categories: Category[];
} 