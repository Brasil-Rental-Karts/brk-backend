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
 * @swagger
 * tags:
 *   name: Clubs
 *   description: Club management endpoints
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
    /**
     * @swagger
     * /clubs:
     *   post:
     *     tags: [Clubs]
     *     summary: Create a new club
     *     description: Create a new club (Member, Manager, or Administrator)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateClubDto'
     *     responses:
     *       201:
     *         description: Club created successfully
     *         headers:
     *           X-Role-Changed:
     *             schema:
     *               type: string
     *             description: Indicates if the user's role was changed to Manager
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    this.router.post(
      '/',
      authMiddleware,
      requireMember,
      validationMiddleware(this.createDtoClass),
      this.create.bind(this)
    );

    /**
     * @swagger
     * /clubs:
     *   get:
     *     tags: [Clubs]
     *     summary: Get all clubs
     *     description: Retrieve a list of all clubs (Member, Manager, or Administrator)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of clubs retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Club'
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    this.router.get(
      '/',
      authMiddleware,
      requireMember,
      this.getAll.bind(this)
    );

    /**
     * @swagger
     * /clubs/{id}:
     *   get:
     *     tags: [Clubs]
     *     summary: Get club by ID
     *     description: Retrieve a specific club by its ID (Member, Manager, or Administrator)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Club ID
     *     responses:
     *       200:
     *         description: Club retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Club'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Club not found
     *       500:
     *         description: Internal server error
     */
    this.router.get(
      '/:id',
      authMiddleware,
      requireMember,
      this.getById.bind(this)
    );

    /**
     * @swagger
     * /clubs/{id}:
     *   put:
     *     tags: [Clubs]
     *     summary: Update club
     *     description: Update a specific club by its ID (Manager or Administrator)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Club ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateClubDto'
     *     responses:
     *       200:
     *         description: Club updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: Club not found
     *       500:
     *         description: Internal server error
     */
    this.router.put(
      '/:id',
      authMiddleware,
      requireManager,
      ownershipCheckMiddleware(this.service),
      validationMiddleware(this.updateDtoClass),
      this.update.bind(this)
    );

    /**
     * @swagger
     * /clubs/{id}:
     *   delete:
     *     tags: [Clubs]
     *     summary: Delete club
     *     description: Delete a specific club by its ID (Manager or Administrator)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Club ID
     *     responses:
     *       200:
     *         description: Club deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: Club not found
     *       500:
     *         description: Internal server error
     */
    this.router.delete(
      '/:id',
      authMiddleware,
      requireManager,
      ownershipCheckMiddleware(this.service),
      this.delete.bind(this)
    );
    
    /**
     * @swagger
     * /clubs/{id}/owner/{userId}:
     *   patch:
     *     tags: [Clubs]
     *     summary: Change club owner
     *     description: Change the owner of a club (Manager or Administrator)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Club ID
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: string
     *         description: New owner's user ID
     *     responses:
     *       200:
     *         description: Club ownership changed successfully
     *         headers:
     *           X-Role-Changed:
     *             schema:
     *               type: string
     *             description: Indicates if any user's role was changed
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: Club or user not found
     *       500:
     *         description: Internal server error
     */
    this.router.patch(
      '/:id/owner/:userId',
      authMiddleware,
      requireManager,
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