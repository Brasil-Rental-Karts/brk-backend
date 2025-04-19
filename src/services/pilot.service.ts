import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Pilot } from '../models/pilot.entity';
import { PilotRepository } from '../repositories/pilot.repository';
import { HttpException } from '../middleware/error.middleware';
import { User, UserRole } from '../models/user.entity';
import { UserService } from './user.service';
import { Category } from '../models/category.entity';

export class PilotService extends BaseService<Pilot> {
  constructor(
    private pilotRepository: PilotRepository,
    private userService: UserService
  ) {
    super(pilotRepository);
  }

  async findAll(): Promise<Pilot[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Pilot | null> {
    return super.findById(id);
  }

  async findByUserId(userId: string): Promise<Pilot | null> {
    const pilots = await this.findAll();
    return pilots.find(pilot => pilot.user.id === userId) || null;
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Pilot | null> {
    const pilots = await this.findAll();
    return pilots.find(pilot => pilot.licenseNumber === licenseNumber) || null;
  }

  async create(pilotData: DeepPartial<Pilot>): Promise<Pilot> {
    // Check for duplicate license number if provided
    if (pilotData.licenseNumber) {
      const existingPilot = await this.findByLicenseNumber(pilotData.licenseNumber as string);
      if (existingPilot) {
        throw new HttpException(409, 'Pilot with this license number already exists');
      }
    }

    // If user object is provided, ensure the user exists and update the role
    if (pilotData.user && (pilotData.user as User).id) {
      const userId = (pilotData.user as User).id;
      const user = await this.userService.findById(userId);
      
      if (!user) {
        throw new HttpException(404, 'User not found');
      }
      
      // Update user role to PILOT if not already
      if (user.role !== UserRole.PILOT) {
        await this.userService.changeUserRole(userId, UserRole.PILOT);
      }
    }

    return super.create(pilotData);
  }

  async update(id: string, pilotData: DeepPartial<Pilot>): Promise<Pilot | null> {
    // Check pilot exists
    const existingPilot = await this.findById(id);
    if (!existingPilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // Check for duplicate license number if being updated
    if (pilotData.licenseNumber && pilotData.licenseNumber !== existingPilot.licenseNumber) {
      const pilotWithLicense = await this.findByLicenseNumber(pilotData.licenseNumber as string);
      if (pilotWithLicense) {
        throw new HttpException(409, 'Pilot with this license number already exists');
      }
    }

    return super.update(id, pilotData);
  }

  async delete(id: string): Promise<boolean> {
    // Check pilot exists
    const existingPilot = await this.findById(id);
    if (!existingPilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // We're not changing the user role back since the user might still need 
    // access to their historical pilot data

    return super.delete(id);
  }

  async assignCategory(pilotId: string, categoryId: string): Promise<Pilot | null> {
    const pilot = await this.findById(pilotId);
    if (!pilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // Initialize categories array if it doesn't exist
    if (!pilot.categories) {
      pilot.categories = [];
    }

    // Check if category is already assigned
    const categoryExists = pilot.categories.some(cat => cat.id === categoryId);
    if (categoryExists) {
      return pilot; // Category already assigned, return pilot without changes
    }

    // Create a new category reference with the provided ID
    const categoryToAdd = new Category();
    categoryToAdd.id = categoryId;

    // Add the category to the pilot
    pilot.categories.push(categoryToAdd);

    // Update the pilot with the new category
    return this.update(pilotId, { categories: pilot.categories });
  }

  async removeCategory(pilotId: string, categoryId: string): Promise<Pilot | null> {
    const pilot = await this.findById(pilotId);
    if (!pilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // Check if pilot has any categories
    if (!pilot.categories || pilot.categories.length === 0) {
      return pilot; // No categories to remove
    }

    // Filter out the category to remove
    pilot.categories = pilot.categories.filter(cat => cat.id !== categoryId);

    // Update the pilot with the updated categories
    return this.update(pilotId, { categories: pilot.categories });
  }

  async getPilotWithResults(pilotId: string): Promise<Pilot | null> {
    const pilot = await this.findById(pilotId);
    if (!pilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // Ensure that results are loaded
    // This assumes that the repository implementation properly loads the results relation
    return pilot;
  }
}