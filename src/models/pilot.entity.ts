import { Entity, Column, OneToOne, JoinColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Result } from './result.entity';
import { Appeal } from './appeal.entity';

@Entity('Pilots')
export class Pilot extends BaseEntity {
  @OneToOne(() => User, user => user.pilot)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, unique: true, nullable: true })
  licenseNumber: string;

  @Column({ length: 20, nullable: true })
  experienceLevel: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  // Relations
  @ManyToMany(() => Category)
  @JoinTable({ 
    name: 'Pilot_Categories',
    joinColumn: { name: 'pilot_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' }
  })
  categories: Category[];

  @OneToMany(() => Result, result => result.pilot)
  results: Result[];

  @OneToMany(() => Appeal, appeal => appeal.filedBy)
  appeals: Appeal[];
} 