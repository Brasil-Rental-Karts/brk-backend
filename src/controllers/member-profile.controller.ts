import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { MemberProfileService } from '../services/member-profile.service';
import { UpsertMemberProfileDto } from '../dtos/member-profile.dto';
import { validationMiddleware } from '../middleware/validator.middleware';
import { authMiddleware, requireMember } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';
import { MemberProfile } from '../models/member-profile.entity';

/**
 * @swagger
 * tags:
 *   name: MemberProfiles
 *   description: Member profile management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MemberProfile:
 *       $ref: '../models/member-profile.entity.ts#/components/schemas/MemberProfile'
 *     UpsertMemberProfileDto:
 *       $ref: '../dtos/member-profile.dto.ts#/components/schemas/UpsertMemberProfileDto'
 */

/**
 * Controller for member profile management
 */
export class MemberProfileController extends BaseController {
  constructor(private memberProfileService: MemberProfileService) {
    super('/member-profiles');
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    /**
     * @swagger
     * /member-profiles:
     *   put:
     *     tags: [MemberProfiles]
     *     summary: Create or update member profile
     *     description: Create a new member profile or update existing one (upsert operation). You only need to include the fields you want to update.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               nickName:
     *                 type: string
     *                 description: User's nickname
     *                 example: "SpeedRacer"
     *               birthDate:
     *                 type: string
     *                 format: date
     *                 description: User's date of birth
     *                 example: "1990-05-15"
     *               gender:
     *                 type: string
     *                 description: User's gender
     *                 example: "Male"
     *               city:
     *                 type: string
     *                 description: User's city
     *                 example: "São Paulo"
     *               state:
     *                 type: string
     *                 description: User's state (2-letter code)
     *                 example: "SP"
     *               experienceTime:
     *                 type: string
     *                 description: User's experience time
     *                 example: "3-5 years"
     *               raceFrequency:
     *                 type: string
     *                 description: User's race frequency
     *                 example: "Weekly"
     *               championshipParticipation:
     *                 type: string
     *                 description: User's championship participation
     *                 example: "Regional"
     *               competitiveLevel:
     *                 type: string
     *                 description: User's competitive level
     *                 example: "Intermediate"
     *               hasOwnKart:
     *                 type: boolean
     *                 description: Whether the user has their own kart
     *                 example: true
     *               isTeamMember:
     *                 type: boolean
     *                 description: Whether the user is a team member
     *                 example: false
     *               teamName:
     *                 type: string
     *                 description: User's team name
     *                 example: "Racing Team"
     *               usesTelemetry:
     *                 type: boolean
     *                 description: Whether the user uses telemetry
     *                 example: true
     *               telemetryType:
     *                 type: string
     *                 description: User's telemetry type
     *                 example: "AiM"
     *               attendsEvents:
     *                 type: string
     *                 description: User's event attendance
     *                 example: "Often"
     *               interestCategories:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: User's categories of interest
     *                 example: ["Sprint", "Endurance"]
     *               preferredTrack:
     *                 type: string
     *                 description: User's preferred track
     *                 example: "Interlagos"
     *           examples:
     *             update:
     *               value: {
     *                 "nickName": "SpeedRacer",
     *                 "gender": "Male",
     *                 "city": "São Paulo",
     *                 "state": "SP",
     *                 "experienceTime": "3-5 years",
     *                 "hasOwnKart": true,
     *                 "interestCategories": ["Sprint", "Endurance"]
     *               }
     *     responses:
     *       200:
     *         description: Profile updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                   format: uuid
     *                   description: Unique identifier (same as User ID)
     *                   example: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
     *                 createdAt:
     *                   type: string
     *                   format: date-time
     *                   description: Timestamp when profile was created
     *                   example: "2023-01-15T10:30:00Z"
     *                 updatedAt:
     *                   type: string
     *                   format: date-time
     *                   description: Timestamp when profile was last updated
     *                   example: "2023-07-25T14:45:00Z"
     *                 lastLoginAt:
     *                   type: string
     *                   format: date-time
     *                   description: Timestamp of the user's last login
     *                   example: "2023-07-25T14:30:00Z"
     *                 nickName:
     *                   type: string
     *                   description: User's nickname
     *                   example: "SpeedRacer"
     *                 birthDate:
     *                   type: string
     *                   format: date
     *                   description: User's date of birth
     *                   example: "1990-05-15"
     *                 gender:
     *                   type: string
     *                   description: User's gender
     *                   example: "Male"
     *                 city:
     *                   type: string
     *                   description: User's city
     *                   example: "São Paulo"
     *                 state:
     *                   type: string
     *                   description: User's state (2-letter code)
     *                   example: "SP"
     *                 experienceTime:
     *                   type: string
     *                   description: User's experience time
     *                   example: "3-5 years"
     *                 raceFrequency:
     *                   type: string
     *                   description: User's race frequency
     *                   example: "Weekly"
     *                 championshipParticipation:
     *                   type: string
     *                   description: User's championship participation
     *                   example: "Regional"
     *                 competitiveLevel:
     *                   type: string
     *                   description: User's competitive level
     *                   example: "Intermediate"
     *                 hasOwnKart:
     *                   type: boolean
     *                   description: Whether the user has their own kart
     *                   example: true
     *                 isTeamMember:
     *                   type: boolean
     *                   description: Whether the user is a team member
     *                   example: false
     *                 teamName:
     *                   type: string
     *                   description: User's team name
     *                   example: "Racing Team"
     *                 usesTelemetry:
     *                   type: boolean
     *                   description: Whether the user uses telemetry
     *                   example: true
     *                 telemetryType:
     *                   type: string
     *                   description: User's telemetry type
     *                   example: "AiM"
     *                 attendsEvents:
     *                   type: string
     *                   description: User's event attendance
     *                   example: "Often"
     *                 interestCategories:
     *                   type: array
     *                   items:
     *                     type: string
     *                   description: User's categories of interest
     *                   example: ["Sprint", "Endurance"]
     *                 preferredTrack:
     *                   type: string
     *                   description: User's preferred track
     *                   example: "Interlagos"
     *             example: {
     *               "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
     *               "createdAt": "2023-01-15T10:30:00Z",
     *               "updatedAt": "2023-07-25T14:45:00Z",
     *               "lastLoginAt": "2023-07-25T14:30:00Z",
     *               "nickName": "SpeedRacer",
     *               "birthDate": "1990-05-15",
     *               "gender": "Male",
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": "3-5 years",
     *               "raceFrequency": "Weekly",
     *               "championshipParticipation": "Regional",
     *               "competitiveLevel": "Intermediate",
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": "Often",
     *               "interestCategories": ["Sprint", "Endurance"],
     *               "preferredTrack": "Interlagos"
     *             }
     *       201:
     *         description: Profile created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                   format: uuid
     *                   description: Unique identifier (same as User ID)
     *                   example: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
     *                 createdAt:
     *                   type: string
     *                   format: date-time
     *                   example: "2023-01-15T10:30:00Z"
     *                 updatedAt:
     *                   type: string
     *                   format: date-time
     *                   example: "2023-07-25T14:45:00Z"
     *                 nickName:
     *                   type: string
     *                   example: "SpeedRacer"
     *                 birthDate:
     *                   type: string
     *                   format: date
     *                   example: "1990-05-15"
     *                 gender:
     *                   type: string
     *                   example: "Male"
     *             example: {
     *               "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
     *               "createdAt": "2023-01-15T10:30:00Z",
     *               "updatedAt": "2023-01-15T10:30:00Z",
     *               "nickName": "SpeedRacer",
     *               "birthDate": "1990-05-15",
     *               "gender": "Male",
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": "3-5 years",
     *               "raceFrequency": "Weekly",
     *               "championshipParticipation": "Regional",
     *               "competitiveLevel": "Intermediate",
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": "Often",
     *               "interestCategories": ["Sprint", "Endurance"],
     *               "preferredTrack": "Interlagos"
     *             }
     *       400:
     *         description: Invalid request data
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Failed to create or update profile",
     *               "errors": ["state must be exactly 2 characters"]
     *             }
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Authentication required"
     *             }
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Failed to create or update profile"
     *             }
     */
    this.router.put(
      '/',
      authMiddleware,
      requireMember,
      validationMiddleware(UpsertMemberProfileDto),
      this.upsertProfile.bind(this)
    );

    /**
     * @swagger
     * /member-profiles:
     *   get:
     *     tags: [MemberProfiles]
     *     summary: Get current user's profile
     *     description: Get the profile of the currently authenticated user
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Profile retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                   format: uuid
     *                   description: Unique identifier (same as User ID)
     *                   example: "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
     *                 createdAt:
     *                   type: string
     *                   format: date-time
     *                   example: "2023-01-15T10:30:00Z"
     *                 updatedAt:
     *                   type: string
     *                   format: date-time
     *                   example: "2023-07-25T14:45:00Z"
     *                 lastLoginAt:
     *                   type: string
     *                   format: date-time
     *                   example: "2023-07-25T14:30:00Z"
     *                 nickName:
     *                   type: string
     *                   example: "SpeedRacer"
     *                 birthDate:
     *                   type: string
     *                   format: date
     *                   example: "1990-05-15"
     *                 gender:
     *                   type: string
     *                   example: "Male"
     *                 city:
     *                   type: string
     *                   example: "São Paulo"
     *                 state:
     *                   type: string
     *                   example: "SP"
     *                 experienceTime:
     *                   type: string
     *                   example: "3-5 years"
     *                 raceFrequency:
     *                   type: string
     *                   example: "Weekly"
     *                 championshipParticipation:
     *                   type: string
     *                   example: "Regional"
     *                 competitiveLevel:
     *                   type: string
     *                   example: "Intermediate"
     *                 hasOwnKart:
     *                   type: boolean
     *                   example: true
     *                 isTeamMember:
     *                   type: boolean
     *                   example: false
     *                 teamName:
     *                   type: string
     *                   example: "Racing Team"
     *                 usesTelemetry:
     *                   type: boolean
     *                   example: true
     *                 telemetryType:
     *                   type: string
     *                   example: "AiM"
     *                 attendsEvents:
     *                   type: string
     *                   example: "Often"
     *                 interestCategories:
     *                   type: array
     *                   items:
     *                     type: string
     *                   example: ["Sprint", "Endurance"]
     *                 preferredTrack:
     *                   type: string
     *                   example: "Interlagos"
     *             example: {
     *               "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
     *               "createdAt": "2023-01-15T10:30:00Z",
     *               "updatedAt": "2023-07-25T14:45:00Z",
     *               "lastLoginAt": "2023-07-25T14:30:00Z",
     *               "nickName": "SpeedRacer",
     *               "birthDate": "1990-05-15",
     *               "gender": "Male",
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": "3-5 years",
     *               "raceFrequency": "Weekly",
     *               "championshipParticipation": "Regional",
     *               "competitiveLevel": "Intermediate",
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": "Often",
     *               "interestCategories": ["Sprint", "Endurance"],
     *               "preferredTrack": "Interlagos"
     *             }
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Authentication required"
     *             }
     *       404:
     *         description: Profile not found
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Profile not found"
     *             }
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             example: {
     *               "message": "Failed to retrieve profile"
     *             }
     */
    this.router.get(
      '/',
      authMiddleware,
      requireMember,
      this.getCurrentUserProfile.bind(this)
    );
  }

  /**
   * Create or update a member profile
   * @param req HTTP request
   * @param res HTTP response
   */
  private async upsertProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = req.user.id;
      const profileData = req.body as UpsertMemberProfileDto;
      
      // Check if profile exists to determine response status
      const existingProfile = await this.memberProfileService.findByUserId(userId);
      const isNewProfile = !existingProfile;
      
      // Perform upsert operation
      const result = await this.memberProfileService.upsert(userId, profileData);
      
      // Return appropriate status code based on whether profile was created or updated
      res.status(isNewProfile ? 201 : 200).json(result);
    } catch (error) {
      console.error(`Error upserting member profile: ${error}`);
      res.status(500).json({ message: 'Failed to create or update profile' });
    }
  }

  /**
   * Get the profile of the currently authenticated user
   * @param req HTTP request
   * @param res HTTP response
   */
  private async getCurrentUserProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = req.user.id;
      const profile = await this.memberProfileService.findByUserId(userId);
      
      if (!profile) {
        res.status(404).json({ message: 'Profile not found' });
        return;
      }
      
      res.status(200).json(profile);
    } catch (error) {
      console.error(`Error retrieving member profile: ${error}`);
      res.status(500).json({ message: 'Failed to retrieve profile' });
    }
  }
} 