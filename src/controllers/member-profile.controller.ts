import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { MemberProfileService } from '../services/member-profile.service';
import { UpsertMemberProfileDto } from '../dtos/member-profile.dto';
import { validationMiddleware } from '../middleware/validator.middleware';
import { authMiddleware, requireMember } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';
import { MemberProfile } from '../models/member-profile.entity';
import { 
  Gender, 
  KartExperienceYears, 
  RaceFrequency, 
  ChampionshipParticipation, 
  CompetitiveLevel, 
  AttendsEvents,
  InterestCategory
} from '../models/member-profile-enums';

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
     *             oneOf:
     *               - type: object
     *                 properties:
     *                   profile:
     *                     type: object
     *                     properties:
     *                       nickName:
     *                         type: string
     *                         description: User's nickname
     *                         example: "SpeedRacer"
     *                       birthDate:
     *                         type: string
     *                         format: date
     *                         description: User's date of birth
     *                         example: "1990-05-15"
     *                       gender:
     *                         type: integer
     *                         description: User's gender (0=Male, 1=Female, 2=Other, 3=PreferNotToSay)
     *                         example: 0
     *                       city:
     *                         type: string
     *                         description: User's city
     *                         example: "São Paulo"
     *                       state:
     *                         type: string
     *                         description: User's state (2-letter code)
     *                         example: "SP"
     *                   # ... More profile fields
     *               - type: object
     *                 properties:
     *                   nickName:
     *                     type: string
     *                     description: User's nickname
     *                     example: "SpeedRacer"
     *                   birthDate:
     *                     type: string
     *                     format: date
     *                     description: User's date of birth
     *                     example: "1990-05-15"
     *                   gender:
     *                     type: integer
     *                     description: User's gender (0=Male, 1=Female, 2=Other, 3=PreferNotToSay)
     *                     example: 0
     *                   city:
     *                     type: string
     *                     description: User's city
     *                     example: "São Paulo"
     *                   state:
     *                     type: string
     *                     description: User's state (2-letter code)
     *                     example: "SP"
     *                 # ... More direct fields
     *           examples:
     *             nested:
     *               value: {
     *                 "profile": {
     *                   "nickName": "SpeedRacer",
     *                   "birthDate": "1990-05-15",
     *                   "gender": 0,
     *                   "city": "São Paulo",
     *                   "state": "SP",
     *                   "experienceTime": 2,
     *                   "hasOwnKart": true,
     *                   "interestCategories": [0, 1]
     *                 }
     *               }
     *             direct:
     *               value: {
     *                 "nickName": "SpeedRacer",
     *                 "gender": 0,
     *                 "city": "São Paulo",
     *                 "state": "SP",
     *                 "experienceTime": 2,
     *                 "hasOwnKart": true,
     *                 "interestCategories": [0, 1]
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
     *                   type: integer
     *                   description: User's gender (0=Male, 1=Female, 2=Other, 3=PreferNotToSay)
     *                   example: 0
     *                 city:
     *                   type: string
     *                   description: User's city
     *                   example: "São Paulo"
     *                 state:
     *                   type: string
     *                   description: User's state (2-letter code)
     *                   example: "SP"
     *                 experienceTime:
     *                   type: integer
     *                   description: Kart experience years (0=Never, 1=LessThanOneYear, 2=OneToTwoYears, 3=ThreeToFiveYears, 4=MoreThanFiveYears)
     *                   example: 2
     *                 raceFrequency:
     *                   type: integer
     *                   description: Race frequency (0=Rarely, 1=Regularly, 2=Weekly, 3=Daily)
     *                   example: 2
     *                 championshipParticipation:
     *                   type: integer
     *                   description: Championship participation (0=Never, 1=LocalRegional, 2=State, 3=National)
     *                   example: 1
     *                 competitiveLevel:
     *                   type: integer
     *                   description: User's competitive level (0=Beginner, 1=Intermediate, 2=Competitive, 3=Professional)
     *                   example: 1
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
     *                   type: integer
     *                   description: User's event attendance (0=Yes, 1=No, 2=DependsOnDistance)
     *                   example: 0
     *                 interestCategories:
     *                   type: array
     *                   items:
     *                     type: integer
     *                   description: User's categories of interest (0=LightRentalKart, 1=HeavyRentalKart, 2=TwoStrokeKart, 3=Endurance, 4=Teams, 5=LongChampionships, 6=SingleRaces)
     *                   example: [0, 1]
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
     *               "gender": 0,
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": 2,
     *               "raceFrequency": 2,
     *               "championshipParticipation": 1,
     *               "competitiveLevel": 1,
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": 0,
     *               "interestCategories": [0, 1],
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
     *                   type: integer
     *                   example: 0
     *             example: {
     *               "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
     *               "createdAt": "2023-01-15T10:30:00Z",
     *               "updatedAt": "2023-01-15T10:30:00Z",
     *               "nickName": "SpeedRacer",
     *               "birthDate": "1990-05-15",
     *               "gender": 0,
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": 2,
     *               "raceFrequency": 2,
     *               "championshipParticipation": 1,
     *               "competitiveLevel": 1,
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": 0,
     *               "interestCategories": [0, 1],
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
     *                   type: integer
     *                   example: 0
     *                 city:
     *                   type: string
     *                   example: "São Paulo"
     *                 state:
     *                   type: string
     *                   example: "SP"
     *                 experienceTime:
     *                   type: integer
     *                   example: 2
     *                 raceFrequency:
     *                   type: integer
     *                   example: 2
     *                 championshipParticipation:
     *                   type: integer
     *                   example: 1
     *                 competitiveLevel:
     *                   type: integer
     *                   example: 1
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
     *                   type: integer
     *                   example: 0
     *                 interestCategories:
     *                   type: array
     *                   items:
     *                     type: integer
     *                   example: [0, 1]
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
     *               "gender": 0,
     *               "city": "São Paulo",
     *               "state": "SP",
     *               "experienceTime": 2,
     *               "raceFrequency": 2,
     *               "championshipParticipation": 1,
     *               "competitiveLevel": 1,
     *               "hasOwnKart": true,
     *               "isTeamMember": false,
     *               "teamName": null,
     *               "usesTelemetry": true,
     *               "telemetryType": "AiM",
     *               "attendsEvents": 0,
     *               "interestCategories": [0, 1],
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
      this.getProfile.bind(this)
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
      
      // Handle both nested and direct payload formats
      const profileData = req.body.profile || req.body;
      
      // Check if profile exists to determine response status
      const existingProfile = await this.memberProfileService.findByUserId(userId);
      const isNewProfile = !existingProfile;
      
      // Perform upsert operation
      const result = await this.memberProfileService.upsert(userId, profileData);
      
      // Return appropriate status code based on whether profile was created or updated
      res.status(isNewProfile ? 201 : 200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create or update profile' });
    }
  }

  /**
   * Get the profile of the currently authenticated user
   * @param req HTTP request
   * @param res HTTP response
   */
  private async getProfile(req: Request, res: Response): Promise<void> {
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
      res.status(500).json({ message: 'Failed to retrieve profile' });
    }
  }
} 