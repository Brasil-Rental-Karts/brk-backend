import { Entity, Column, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Club } from './club.entity';

@Entity('Organizers')
export class Organizer extends BaseEntity {
  @OneToOne(() => User, user => user.organizer)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, nullable: true })
  role: string;

  @Column({ length: 100, nullable: true })
  certification: string;

  // Relations
  @ManyToMany(() => Club)
  @JoinTable({
    name: 'Club_Organizers',
    joinColumn: { name: 'organizer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'club_id', referencedColumnName: 'id' }
  })
  clubs: Club[];
} 