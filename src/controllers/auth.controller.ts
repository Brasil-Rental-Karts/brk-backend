import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto } from '../dtos/auth.dto';
import { authMiddleware } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { validationMiddleware } from '../middleware/validator.middleware';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    super('/auth');
    this.authService = authService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    // Public routes
    this.router.post('/register', validationMiddleware(RegisterUserDto), this.register.bind(this));
    this.router.post('/login', validationMiddleware(LoginUserDto), this.login.bind(this));
    this.router.post('/refresh-token', validationMiddleware(RefreshTokenDto), this.refreshToken.bind(this));
    
    // Protected routes
    this.router.post('/logout', authMiddleware, this.logout.bind(this));
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const registerUserDto: RegisterUserDto = req.body;
      const user = await this.authService.register(registerUserDto);
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User with this email already exists') {
        res.status(409).json({ message: error.message });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const loginUserDto: LoginUserDto = req.body;
      const tokens = await this.authService.login(loginUserDto);
      
      res.status(200).json(tokens);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'Invalid email or password' || 
           error.message === 'User account is inactive')) {
        res.status(401).json({ message: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  private async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenDto;
      
      try {
        // Use any type to work around typescript issues
        const jwtVerify: any = jwt.verify;
        
        // Verify the refresh token to get the user id
        const decoded = jwtVerify(refreshToken, config.jwt.secret) as { id: string };
        
        // Get new tokens
        const tokens = await this.authService.refreshToken(decoded.id, refreshToken);
        
        res.status(200).json(tokens);
      } catch (jwtError) {
        res.status(401).json({ message: 'Invalid refresh token' });
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      this.authService.logout(req.user.id);
      
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
} 