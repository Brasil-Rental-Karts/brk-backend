import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/user.entity';
import config from '../config/config';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// Verify JWT token
export const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication token is required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Use any type to work around typescript issues
    const jwtVerify: any = jwt.verify;
    const decoded = jwtVerify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: UserRole;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role-based middleware
export const roleMiddleware = (roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission to access this resource' });
      return;
    }

    next();
  };
};

// Middleware shortcuts for specific roles
export const requireAdmin = roleMiddleware([UserRole.ADMINISTRATOR]);
export const requireOrganizer = roleMiddleware([UserRole.ADMINISTRATOR, UserRole.ORGANIZER]);
export const requirePilot = roleMiddleware([UserRole.ADMINISTRATOR, UserRole.PILOT]);
export const requireMember = roleMiddleware([UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER]); 