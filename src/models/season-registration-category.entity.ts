import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { SeasonRegistration } from './season-registration.entity';

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
