import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('Clubs')
export class Club extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'date', nullable: true })
  foundationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  logoUrl: string;
  
  @Column({ nullable: true })
  ownerId: string;
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;
} 