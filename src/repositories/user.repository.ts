import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class UserRepository extends BaseRepositoryImpl<User> {
  constructor(repository: Repository<User>) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
  
  async findByResetPasswordToken(token: string): Promise<User | null> {
    return this.repository.findOne({ where: { resetPasswordToken: token } });
  }
  
  async updateUser(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async findByEmailConfirmationToken(token: string): Promise<User | null> {
    return this.repository.findOne({ where: { emailConfirmationToken: token } });
  }

  async findAllWithMemberProfiles(): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.memberProfile', 'memberProfile')
      .getMany();
  }
} 