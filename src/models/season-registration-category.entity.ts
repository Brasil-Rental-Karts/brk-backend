import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SeasonRegistration } from './season-registration.entity';
import { Category } from './category.entity';

@Entity('SeasonRegistrationCategories')
@Index(['registrationId', 'categoryId'], { unique: true })
export class SeasonRegistrationCategory extends BaseEntity {
  @Column({ nullable: false })
  registrationId: string;

  @Column({ nullable: false })
  categoryId: string;

  // Relacionamentos
  @ManyToOne(() => SeasonRegistration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registrationId' })
  registration: SeasonRegistration;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;
} 