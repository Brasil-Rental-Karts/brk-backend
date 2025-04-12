import { Entity, Column, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { KartingTrack } from './karting-track.entity';

@Entity('Administrators')
export class Administrator extends BaseEntity {
  @OneToOne(() => User, user => user.administrator)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20, nullable: true })
  accessLevel: string;

  @Column({ length: 50, nullable: true })
  department: string;

  // Relations
  @ManyToMany(() => KartingTrack)
  @JoinTable({
    name: 'Track_Administrators',
    joinColumn: { name: 'administrator_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'track_id', referencedColumnName: 'id' }
  })
  tracks: KartingTrack[];
} 