import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { SeasonRegistration } from './season-registration.entity';
import { Stage } from './stage.entity';

@Entity('SeasonRegistrationStages')
@Index(['registrationId', 'stageId'], { unique: true })
export class SeasonRegistrationStage extends BaseEntity {
  @Column({ nullable: false })
  registrationId: string;

  @Column({ nullable: false })
  stageId: string;

  // Relacionamentos
  @ManyToOne(() => SeasonRegistration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registrationId' })
  registration: SeasonRegistration;

  @ManyToOne(() => Stage)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;
}
