import { DeepPartial } from 'typeorm';
import { MemberProfile } from '../models/member-profile.entity';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { BaseService } from './base.service';
import { UpsertMemberProfileDto } from '../dtos/member-profile.dto';

export class MemberProfileService extends BaseService<MemberProfile> {
  constructor(protected repository: MemberProfileRepository) {
    super(repository);
  }

  /**
   * Find a member profile by user ID
   * @param userId The user ID
   * @returns The member profile or null if not found
   */
  async findByUserId(userId: string): Promise<MemberProfile | null> {
    return (this.repository as MemberProfileRepository).findByUserId(userId);
  }

  /**
   * Update a member profile's last login timestamp
   * @param userId The user ID
   * @returns The updated member profile or null if not found
   */
  async updateLastLogin(userId: string): Promise<MemberProfile | null> {
    return (this.repository as MemberProfileRepository).updateLastLogin(userId);
  }

  /**
   * Create or update a member profile (upsert)
   * @param userId The user ID
   * @param data The profile data
   * @returns The created or updated profile
   */
  async upsert(userId: string, data: UpsertMemberProfileDto): Promise<MemberProfile> {
    // Check if profile exists
    const existingProfile = await this.findByUserId(userId);
    
    // Create new profile if it doesn't exist
    if (!existingProfile) {
      // Set ID to match user ID for new profile
      const newProfileData: DeepPartial<MemberProfile> = {
        ...data,
        id: userId
      };
      
      return this.repository.create(newProfileData);
    }
    
    // Update existing profile
    const updatedProfile = await this.repository.update(userId, data);
    
    if (!updatedProfile) {
      throw new Error('Failed to update member profile');
    }
    
    return updatedProfile;
  }
} 