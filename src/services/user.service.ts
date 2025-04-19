import bcrypt from 'bcrypt';
import { BaseService } from './base.service';
import { User } from '../models/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { HttpException } from '../middleware/error.middleware';

export class UserService extends BaseService<User> {
  constructor(private userRepository: UserRepository) {
    super(userRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(userData: Partial<User>): Promise<User> {
    // Check if user with this email already exists
    const existingUser = await this.findByEmail(userData.email!);
    if (existingUser) {
      throw new HttpException(409, 'User with this email already exists');
    }

    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return super.create(userData);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    // Check if email is being updated and is already in use
    if (userData.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new HttpException(409, 'Email is already in use');
      }
    }

    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return super.update(id, userData);
  }
} 