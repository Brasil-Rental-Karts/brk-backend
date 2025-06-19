import { BaseCrudController } from './base.crud.controller';
import { User, UserRole } from '../models/user.entity';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * Controller for user management
 */
export class UserController extends BaseCrudController<User, CreateUserDto, UpdateUserDto> {
  protected service: UserService;
  protected createDtoClass = CreateUserDto;
  protected updateDtoClass = UpdateUserDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR],
    read: [UserRole.ADMINISTRATOR],
    update: [UserRole.ADMINISTRATOR],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(userService: UserService) {
    super('/users');
    this.service = userService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    /**
     * @swagger
     * /users/me:
     *   delete:
     *     tags: [Users]
     *     summary: Delete my account
     *     description: Anonymize the currently authenticated user's account (Members only). This action is permanent.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User account deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: User not found
     *       500:
     *         description: Internal server error
     */
    this.router.delete(
      '/me',
      authMiddleware,
      roleMiddleware([UserRole.MEMBER]),
      this.deleteMyAccount
    );

    /**
     * @swagger
     * /users:
     *   post:
     *     tags: [Users]
     *     summary: Create a new user
     *     description: Create a new user (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateUserDto'
     *     responses:
     *       201:
     *         description: User created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       500:
     *         description: Internal server error
     */
    /**
     * @swagger
     * /users:
     *   get:
     *     tags: [Users]
     *     summary: Get all users
     *     description: Retrieve a list of all users (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of users retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/User'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       500:
     *         description: Internal server error
     */
    /**
     * @swagger
     * /users/{id}:
     *   get:
     *     tags: [Users]
     *     summary: Get user by ID
     *     description: Retrieve a specific user by their ID (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID
     *     responses:
     *       200:
     *         description: User retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: User not found
     *       500:
     *         description: Internal server error
     */
    /**
     * @swagger
     * /users/{id}:
     *   put:
     *     tags: [Users]
     *     summary: Update user
     *     description: Update a specific user by their ID (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateUserDto'
     *     responses:
     *       200:
     *         description: User updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: User not found
     *       500:
     *         description: Internal server error
     */
    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     tags: [Users]
     *     summary: Delete user
     *     description: Delete a specific user by their ID (Administrator only)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID
     *     responses:
     *       200:
     *         description: User deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Insufficient permissions
     *       404:
     *         description: User not found
     *       500:
     *         description: Internal server error
     */
    this.initializeCrudRoutes();
    // Additional custom routes can be added here
  }

  deleteMyAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      await this.service.anonymizeUser(userId);
      res.status(200).send({ message: 'User account deleted successfully.' });
    } catch (error) {
      next(error);
    }
  };
}
