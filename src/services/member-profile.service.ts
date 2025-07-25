import { DeepPartial } from 'typeorm';

import { UpsertMemberProfileDto } from '../dtos/member-profile.dto';
import { MemberProfile } from '../models/member-profile.entity';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { BaseService } from './base.service';
import { UserService } from './user.service';

export class MemberProfileService extends BaseService<MemberProfile> {
  constructor(
    protected repository: MemberProfileRepository,
    private userService?: UserService
  ) {
    super(repository);
  }

  /**
   * Find a member profile by user ID
   * @param userId The user ID
   * @returns The member profile or null if not found
   */
  async findByUserId(userId: string): Promise<MemberProfile | null> {
    const profile = await (
      this.repository as MemberProfileRepository
    ).findByUserId(userId);

    // If we have userService, try to get user data
    if (this.userService) {
      try {
        const user = await this.userService.findById(userId);
        if (user) {
          if (profile) {
            // Add name and phone from user table to the existing profile response
            (profile as any).name = user.name;
            (profile as any).phone = user.phone;
          } else {
            // If no profile exists, create a minimal profile object with user data
            return {
              id: userId,
              name: user.name,
              phone: user.phone,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: null,
              nickName: null,
              birthDate: null,
              gender: null,
              city: null,
              state: null,
              experienceTime: null,
              raceFrequency: null,
              championshipParticipation: null,
              competitiveLevel: null,
              hasOwnKart: false,
              isTeamMember: false,
              teamName: null,
              usesTelemetry: false,
              telemetryType: null,
              attendsEvents: null,
              interestCategories: [],
              preferredTrack: null,
              profileCompleted: false,
            } as any;
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data for profile:', error);
        // Continue without user data if fetch fails
      }
    }

    return profile;
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
  async upsert(
    userId: string,
    data: UpsertMemberProfileDto
  ): Promise<MemberProfile> {
    try {
      // Extract fields that should be updated in the users table
      const userUpdateData: { name?: string; phone?: string } = {};
      if (data.name) userUpdateData.name = data.name;
      if (data.phone) userUpdateData.phone = data.phone;

      // Update user table if we have userService and relevant fields
      if (this.userService && Object.keys(userUpdateData).length > 0) {
        try {
          await this.userService.update(userId, userUpdateData);
        } catch (error) {
          console.error('Failed to update user data:', error);
          // Continue with profile update even if user update fails
        }
      }

      // Check if profile exists - use repository directly to avoid fake profile creation
      const existingProfile = await (
        this.repository as MemberProfileRepository
      ).findByUserId(userId);

      // Create new profile if it doesn't exist
      if (!existingProfile) {
        // Set ID to match user ID for new profile
        const newProfileData: DeepPartial<MemberProfile> = {
          ...data,
          id: userId,
          profileCompleted: true, // Mark as completed when creating new profile
        };

        return this.repository.create(newProfileData);
      }

      // Update existing profile and mark as completed
      const updateData = {
        ...data,
        profileCompleted: true, // Always mark as completed when updating
      };

      const updatedProfile = await this.repository.update(userId, updateData);

      if (!updatedProfile) {
        throw new Error('Failed to update member profile');
      }

      return updatedProfile;
    } catch (error) {
      console.error('Error in upsert method:', error);
      throw error;
    }
  }
}
