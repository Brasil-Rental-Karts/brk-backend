import bcrypt from 'bcrypt';
import { BaseService } from './base.service';
import { User, UserRole } from '../models/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { HttpException } from '../exceptions/http.exception';

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

    // Set registration date to current date if not provided
    if (!userData.registrationDate) {
      userData.registrationDate = new Date();
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

  async changeUserRole(id: string, newRole: UserRole): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }

    // Only update the role field, don't touch other fields including the password
    return this.update(id, { role: newRole });
  }

  async makeUserManager(id: string): Promise<User | null> {
    return this.changeUserRole(id, UserRole.MANAGER);
  }

  async activateAccount(id: string): Promise<User | null> {
    return this.update(id, { active: true });
  }

  async deactivateAccount(id: string): Promise<User | null> {
    return this.update(id, { active: false });
  }

  async getUserProfile(id: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }
    
    // Create a copy of the user object without the password
    const userWithoutPassword = { ...user };
    if ('password' in userWithoutPassword) {
      delete (userWithoutPassword as any).password;
    }
    
    return userWithoutPassword as User;
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    return user;
  }
} 