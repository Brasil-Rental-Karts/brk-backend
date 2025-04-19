import { BaseCrudController } from './base.crud.controller';
import { Club } from '../models/club.entity';
import { ClubService } from '../services/club.service';
import { CreateClubDto, UpdateClubDto } from '../dtos/club.dto';
import { UserRole } from '../models/user.entity';

/**
 * @swagger
 * tags:
 *   name: Clubs
 *   description: Club management
 */

/**
 * @swagger
 * /clubs:
 *   post:
 *     summary: Create a new club
 *     description: Create a new club (admin only)
 *     tags: [Clubs]
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all clubs
 *     description: Retrieve a list of all clubs (available to admins and members)
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of clubs
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
 * 
 * /clubs/{id}:
 *   get:
 *     summary: Get club by ID
 *     description: Retrieve a club by ID (available to admins and members)
 *     tags: [Clubs]
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
 *   put:
 *     summary: Update club
 *     description: Update a club by ID (admin only)
 *     tags: [Clubs]
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
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Club not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete club
 *     description: Delete a club by ID (admin only)
 *     tags: [Clubs]
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
 *       204:
 *         description: Club deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Club not found
 *       500:
 *         description: Internal server error
 */
export class ClubController extends BaseCrudController<Club, CreateClubDto, UpdateClubDto> {
  protected service: ClubService;
  protected createDtoClass = CreateClubDto;
  protected updateDtoClass = UpdateClubDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR],
    read: [UserRole.ADMINISTRATOR, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(clubService: ClubService) {
    super('/clubs');
    this.service = clubService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}