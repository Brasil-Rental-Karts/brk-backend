import bcrypt from 'bcrypt';
import { BaseService } from './base.service';
import { User, UserRole } from '../models/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { RedisService } from './redis.service';
import { HttpException } from '../exceptions/http.exception';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { v4 as uuidv4 } from 'uuid';

export class UserService extends BaseService<User> {
  private redisService: RedisService;
  
  constructor(
    private userRepository: UserRepository,
    private memberProfileRepository: MemberProfileRepository
    ) {
    super(userRepository);
    this.redisService = RedisService.getInstance();
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

  async anonymizeUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }

    const memberProfile = await this.memberProfileRepository.findById(userId);

    // Anonymize User
    const anonymizedEmail = `deleted-user-${uuidv4()}@brk.com.br`;
    user.name = 'Usuário Removido';
    user.email = anonymizedEmail;
    user.phone = '';
    user.password = uuidv4(); // Set a new random, unusable password
    user.active = false;
    user.googleId = '';
    user.profilePicture = '';
    user.emailConfirmed = false;
    
    await this.userRepository.update(user.id, user);

    // Delete MemberProfile
    if (memberProfile) {
      await this.memberProfileRepository.delete(memberProfile.id);
    }
  }

  // Cache-related methods
  async cacheUserBasicInfo(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    // Get nickname from MemberProfile if exists
    const memberProfile = await this.memberProfileRepository.findById(userId);
    const nickname = memberProfile?.nickName || '';

    const userInfo = {
      id: user.id,
      name: user.name,
      profilePicture: user.profilePicture || '',
      active: user.active,
      nickname: nickname
    };

    return this.redisService.cacheUserBasicInfo(userId, userInfo);
  }

  async getUserBasicInfoFromCache(userId: string): Promise<any | null> {
    return this.redisService.getCachedUserBasicInfo(userId);
  }

  async getUserBasicInfoOptimized(userId: string): Promise<any | null> {
    // Try to get from cache first
    const cachedUser = await this.getUserBasicInfoFromCache(userId);
    if (cachedUser) {
      return cachedUser;
    }

    // If not in cache, get from database and cache it
    const user = await this.findById(userId);
    if (user) {
      await this.cacheUserBasicInfo(userId);
      // Get nickname from MemberProfile if exists
      const memberProfile = await this.memberProfileRepository.findById(userId);
      const nickname = memberProfile?.nickName || '';
      
      return {
        id: user.id,
        name: user.name,
        profilePicture: user.profilePicture || '',
        active: user.active,
        nickname: nickname
      };
    }

    return null;
  }

  async getMultipleUsersBasicInfo(userIds: string[]): Promise<any[]> {
    // Use Redis pipeline for ultra-fast bulk retrieval
    const cachedUsers = await this.redisService.getMultipleUsersBasicInfo(userIds);
    
    // If we got all users from cache, return them
    if (cachedUsers.length === userIds.length) {
      return cachedUsers;
    }

    // Otherwise, fetch missing users from database
    const cachedUserIds = cachedUsers.map(user => user.id);
    const missingUserIds = userIds.filter(id => !cachedUserIds.includes(id));

    if (missingUserIds.length > 0) {
      // Fetch missing users from database one by one
      const missingUsers: User[] = [];
      for (const userId of missingUserIds) {
        const user = await this.userRepository.findById(userId);
        if (user) {
          missingUsers.push(user);
        }
      }
      
      // Cache the missing users
      for (const user of missingUsers) {
        await this.cacheUserBasicInfo(user.id);
      }

      // Get the freshly cached users with nickname included
      const freshlyCache = await this.redisService.getMultipleUsersBasicInfo(missingUserIds);

      return [...cachedUsers, ...freshlyCache];
    }

    return cachedUsers;
  }

  async invalidateUserCache(userId: string): Promise<boolean> {
    return this.redisService.invalidateUserCache(userId);
  }

  async getAllCachedUserIds(): Promise<string[]> {
    return this.redisService.getAllUserIds();
  }

  async preloadAllUsersToCache(): Promise<void> {
    // Get all users from database
    const allUsers = await this.userRepository.findAll();
    
    // Cache all users
    for (const user of allUsers) {
      await this.cacheUserBasicInfo(user.id);
    }
  }

  /*
   * USAGE EXAMPLES:
   * 
   * // Get user from cache (ultra-fast) - includes nickname from MemberProfile
   * const userFromCache = await userService.getUserBasicInfoFromCache(userId);
   * // Returns: { id, name, profilePicture, active, nickname }
   * 
   * // Get user (cache-first, fallback to database) - includes nickname
   * const userOptimized = await userService.getUserBasicInfoOptimized(userId);
   * 
   * // Get multiple users at once (uses Redis pipeline) - includes nicknames
   * const multipleUsers = await userService.getMultipleUsersBasicInfo([id1, id2, id3]);
   * 
   * // Preload all users to cache (useful for startup) - includes nicknames
   * await userService.preloadAllUsersToCache();
   */
} 