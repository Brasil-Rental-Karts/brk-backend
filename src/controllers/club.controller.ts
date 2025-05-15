import { Request, Response, NextFunction } from 'express';
import { BaseCrudController } from './base.crud.controller';
import { Club } from '../models/club.entity';
import { ClubService } from '../services/club.service';
import { CreateClubDto, UpdateClubDto } from '../dtos/club.dto';
import { UserRole } from '../models/user.entity';
import { authMiddleware, requireMember, requireManager } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { ownershipCheckMiddleware } from '../middleware/club.middleware';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { HttpException } from '../exceptions/http.exception';

/**
 * Controller for club management
 */

/**
 * Controller for club management
 */
export class ClubController extends BaseCrudController<Club, CreateClubDto, UpdateClubDto> {
  protected service: ClubService;
  protected createDtoClass = CreateClubDto;
  protected updateDtoClass = UpdateClubDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.MEMBER],
    read: [UserRole.ADMINISTRATOR, UserRole.MEMBER, UserRole.MANAGER],
    update: [UserRole.ADMINISTRATOR, UserRole.MANAGER],
    delete: [UserRole.ADMINISTRATOR, UserRole.MANAGER]
  };
  
  private userService: UserService;
  private authService: AuthService;

  constructor(clubService: ClubService, userService: UserService, authService: AuthService) {
    super('/clubs');
    this.service = clubService;
    this.userService = userService;
    this.authService = authService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    // Override the default routes to add custom logic for owner permissions
    
    // CREATE
    this.router.post(
      '/',
      authMiddleware,
      requireMember,
      validationMiddleware(this.createDtoClass),
      this.create.bind(this)
    );

    // READ ALL
    this.router.get(
      '/',
      authMiddleware,
      requireMember,
      this.getAll.bind(this)
    );

    // READ ONE
    this.router.get(
      '/:id',
      authMiddleware,
      requireMember,
      this.getById.bind(this)
    );

    // UPDATE
    this.router.put(
      '/:id',
      authMiddleware,
      requireManager,
      ownershipCheckMiddleware(this.service),
      validationMiddleware(this.updateDtoClass),
      this.update.bind(this)
    );

    // DELETE
    this.router.delete(
      '/:id',
      authMiddleware,
      requireManager,
      ownershipCheckMiddleware(this.service),
      this.delete.bind(this)
    );
    
    // CHANGE OWNER - Only admins can change club ownership
    this.router.patch(
      '/:id/owner/:userId',
      authMiddleware,
      requireManager, // Only administrators can change ownership
      this.changeOwner.bind(this)
    );
  }
  
  protected async create(req: Request, res: Response): Promise<void> {
    try {
      // Ensure the user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      // Create the club with the current user as owner
      const result = await this.service.createWithOwner(req.body, req.user.id);
      
      // If the user is a Member, upgrade to Manager
      if (req.user.role === UserRole.MEMBER) {
        try {
          // Update the user's role to Manager, only modifying the role field
          await this.userService.changeUserRole(req.user.id, UserRole.MANAGER);
          
          // Log the role change
          console.log(`User ${req.user.id} was promoted to Manager after creating club ${result.id}`);
          
          // Add a response header to indicate that the user's role has been changed
          res.setHeader('X-Role-Changed', 'true');
          
          // Create a response object with both the club and a message about the role change
          const responseWithMessage = {
            ...result,
            message: 'You have been promoted to Manager role. Please refresh your session.'
          };
          
          res.status(201).json(responseWithMessage);
          return;
        } catch (roleError) {
          // Log the error but continue since the club was created successfully
          console.error(`Error upgrading user role: ${roleError}`);
        }
      }
      
      // Standard response if no role change occurred
      res.status(201).json(result);
    } catch (error) {
      console.error(`Error creating club: ${error}`);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('foreign key constraint')) {
          res.status(400).json({ message: 'Invalid owner ID. Please ensure the owner exists in the system.' });
        } else {
          res.status(500).json({ message: error.message || 'Failed to create club' });
        }
      } else {
        res.status(500).json({ message: 'Failed to create club' });
      }
    }
  }

  protected async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      // For security, remove any ownerId from the request body to prevent ownership changes
      // Ownership can only be changed through a dedicated endpoint by admins
      const { ownerId, ...updateData } = req.body;
      
      // For admins, we allow them to update any club without changing ownership
      // For managers, the ownership check middleware already ensured they own the club
      
      const updatedItem = await this.service.update(id, updateData);
      
      if (!updatedItem) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }
      
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error(`Error updating resource: ${error}`);
      
      // Provide more specific error message for foreign key constraint violations
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        res.status(400).json({ 
          message: 'Invalid owner ID. Please ensure the owner exists in the system.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to update resource' });
      }
    }
  }

  /**
   * Change the owner of a club
   * Only Administrators and the club owner (Manager) can change the club ownership
   */
  async changeOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;
      
      // Ensure user is authenticated (should be guaranteed by authMiddleware)
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      const userRole = req.user.role;
      const requesterId = req.user.id;
      
      // Only Administrator or the current owner can change the ownership
      if (userRole !== UserRole.ADMINISTRATOR) {
        // If not admin, check if they are the owner
        const club = await this.service.findById(id);
        if (!club) {
          throw new HttpException(404, 'Club not found');
        }
        
        if (club.ownerId !== requesterId) {
          throw new HttpException(403, 'Access denied. Only club owners can transfer ownership.');
        }
      }
      
      const result = await this.service.changeOwner(id, userId);
      
      // Set response headers if the new owner got promoted or previous owner got demoted
      if (result.previousOwnerId) {
        if (result.roleDemoted) {
          res.setHeader('X-Role-Changed', `User ${result.previousOwnerId} was demoted to Member`);
        }
      }
      
      res.status(200).json({
        data: result.club,
        message: 'Club ownership changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}