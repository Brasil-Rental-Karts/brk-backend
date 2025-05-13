import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../models/user.entity';
import { ClubService } from '../services/club.service';

/**
 * Middleware for checking if the user has permission to modify a club
 * - Administrators can modify any club
 * - Managers can only modify clubs they own
 */
export const ownershipCheckMiddleware = (clubService: ClubService): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const clubId = req.params.id;

      // Administrators can modify any club
      if (req.user.role === UserRole.ADMINISTRATOR) {
        next();
        return;
      }

      // Managers can only modify clubs they own
      const isManager = req.user.role === UserRole.MANAGER;
      if (isManager) {
        const isOwner = await clubService.isOwner(clubId, req.user.id);
        if (!isOwner) {
          res.status(403).json({ message: 'You do not have permission to modify this club' });
          return;
        }
      }

      next();
    } catch (error) {
      console.error(`Error in ownership check middleware: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}; 