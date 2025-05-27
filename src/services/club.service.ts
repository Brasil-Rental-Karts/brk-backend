import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Club } from '../models/club.entity';
import { ClubRepository } from '../repositories/club.repository';
import { HttpException } from '../exceptions/http.exception';
import { UserService } from './user.service';
import { UserRole } from '../models/user.entity';
import { RedisService } from './redis.service';

export class ClubService extends BaseService<Club> {
  private userService?: UserService;
  private redisService: RedisService;

  constructor(private clubRepository: ClubRepository) {
    super(clubRepository);
    this.redisService = RedisService.getInstance();
  }

  // Set the user service (to avoid circular dependencies)
  setUserService(userService: UserService): void {
    this.userService = userService;
  }

  async findAll(): Promise<Club[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Club | null> {
    try {
      // Try to get from cache first
      const cachedClub = await this.redisService.getCachedClub(id);
      if (cachedClub) {
        console.log(`Found club ${id} in cache`);
        return cachedClub;
      }

      // If not in cache, get from database
      const club = await super.findById(id);
      
      // Cache the result if found
      if (club) {
        await this.redisService.cacheClubData(club);
        console.log(`Cached club ${id} from database`);
      }
      
      return club;
    } catch (error) {
      console.error('Error in findById with cache:', error);
      // Fallback to database only
      return super.findById(id);
    }
  }

  async create(clubData: DeepPartial<Club>): Promise<Club> {
    // Validate ownerId if provided and userService is available
    if (clubData.ownerId && this.userService) {
      const ownerExists = await this.userService.findById(clubData.ownerId as string);
      if (!ownerExists) {
        throw new HttpException(400, 'Invalid owner ID. The specified user does not exist.');
      }
    }
    
    return super.create(clubData);
  }

  async update(id: string, clubData: DeepPartial<Club>): Promise<Club | null> {
    // Validate ownerId if provided and userService is available
    if (clubData.ownerId && this.userService) {
      const ownerExists = await this.userService.findById(clubData.ownerId as string);
      if (!ownerExists) {
        throw new HttpException(400, 'Invalid owner ID. The specified user does not exist.');
      }
    }
    
    return super.update(id, clubData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
  
  async findByOwnerId(ownerId: string): Promise<Club[]> {
    // We'll filter the clubs ourselves since the repository doesn't have a findBy method
    const allClubs = await this.findAll();
    return allClubs.filter(club => club.ownerId === ownerId);
  }
  
  async isOwner(clubId: string, userId: string): Promise<boolean> {
    const club = await this.findById(clubId);
    if (!club) {
      return false;
    }
    return club.ownerId === userId;
  }
  
  async updateByOwner(clubId: string, ownerId: string, clubData: DeepPartial<Club>): Promise<Club | null> {
    const club = await this.findById(clubId);
    
    if (!club) {
      throw new HttpException(404, 'Club not found');
    }
    
    if (club.ownerId !== ownerId) {
      throw new HttpException(403, 'You do not have permission to update this club');
    }
    
    return this.update(clubId, clubData);
  }
  
  async deleteByOwner(clubId: string, ownerId: string): Promise<boolean> {
    const club = await this.findById(clubId);
    
    if (!club) {
      throw new HttpException(404, 'Club not found');
    }
    
    if (club.ownerId !== ownerId) {
      throw new HttpException(403, 'You do not have permission to delete this club');
    }
    
    return this.delete(clubId);
  }

  /**
   * Create a club with a specific owner
   * This method should only be called by controllers that validate the owner properly
   */
  async createWithOwner(clubData: DeepPartial<Club>, ownerId: string): Promise<Club> {
    // Validate ownerId existence if userService is available
    if (this.userService) {
      const ownerExists = await this.userService.findById(ownerId);
      if (!ownerExists) {
        throw new HttpException(400, 'Invalid owner ID. The specified user does not exist.');
      }
    }
    
    // Set the ownerId and create the club
    const clubWithOwner = { ...clubData, ownerId };
    return super.create(clubWithOwner);
  }

  /**
   * Change the owner of a club
   * This method should only be called by admin controllers
   * If the new owner is not an Administrator, they will be promoted to Manager
   * If the previous owner is not an Administrator and doesn't own any other clubs, they will be demoted to Member
   */
  async changeOwner(clubId: string, newOwnerId: string): Promise<{club: Club | null, previousOwnerId?: string, roleDemoted?: boolean}> {
    const club = await this.findById(clubId);
    
    if (!club) {
      throw new HttpException(404, 'Club not found');
    }
    
    const previousOwnerId = club.ownerId;
    
    // Validate the new owner's existence
    if (this.userService) {
      const newOwner = await this.userService.findById(newOwnerId);
      if (!newOwner) {
        throw new HttpException(400, 'Invalid owner ID. The specified user does not exist.');
      }
      
      // If the new owner is not an Administrator, promote them to Manager
      if (newOwner.role !== UserRole.ADMINISTRATOR) {
        try {
          await this.userService.changeUserRole(newOwnerId, UserRole.MANAGER);
          console.log(`User ${newOwnerId} was promoted to Manager after becoming a club owner`);
        } catch (error) {
          console.error(`Error upgrading user role: ${error}`);
          // Continue with the ownership change even if role upgrade fails
        }
      }
    }
    
    // Update only the ownerId field
    const updatedClub = await super.update(clubId, { ownerId: newOwnerId });
    
    // Check if previous owner should be demoted
    let roleDemoted = false;
    if (previousOwnerId && previousOwnerId !== newOwnerId && this.userService) {
      try {
        // Get the previous owner
        const previousOwner = await this.userService.findById(previousOwnerId);
        
        // If the previous owner is not an Administrator, check if they still own any clubs
        if (previousOwner && previousOwner.role !== UserRole.ADMINISTRATOR) {
          // Find all clubs owned by the previous owner
          const ownedClubs = await this.findByOwnerId(previousOwnerId);
          
          // If they don't own any other clubs, demote them to Member
          if (ownedClubs.length === 0) {
            await this.userService.changeUserRole(previousOwnerId, UserRole.MEMBER);
            console.log(`User ${previousOwnerId} was demoted to Member after losing ownership of their last club`);
            roleDemoted = true;
          }
        }
      } catch (error) {
        console.error(`Error checking/updating previous owner's role: ${error}`);
        // Continue even if there's an error with role demotion
      }
    }
    
    return { 
      club: updatedClub,
      previousOwnerId: previousOwnerId !== newOwnerId ? previousOwnerId : undefined,
      roleDemoted
    };
  }
}