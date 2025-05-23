import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto } from '../dtos/auth.dto';
import { authMiddleware } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { validationMiddleware } from '../middleware/validator.middleware';
import { GoogleAuthService } from '../services/google-auth.service';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * Authentication controller to handle login, registration, and token management
 */
export class AuthController extends BaseController {
  private authService: AuthService;
  private googleAuthService: GoogleAuthService;

  constructor(authService: AuthService, googleAuthService: GoogleAuthService) {
    super('/auth');
    this.authService = authService;
    this.googleAuthService = googleAuthService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    // Public routes
    /**
     * @swagger
     * /auth/register:
     *   post:
     *     tags: [Authentication]
     *     summary: Register a new user
     *     description: Creates a new user account with the provided information
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterUserDto'
     *     responses:
     *       201:
     *         description: User registered successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     name:
     *                       type: string
     *                     email:
     *                       type: string
     *                     role:
     *                       type: string
     *       409:
     *         description: User with this email already exists
     *       500:
     *         description: Internal server error
     */
    this.router.post('/register', validationMiddleware(RegisterUserDto), this.register.bind(this));
    
    /**
     * @swagger
     * /auth/login:
     *   post:
     *     tags: [Authentication]
     *     summary: Login user
     *     description: Authenticate user and get access and refresh tokens
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginUserDto'
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TokenDto'
     *       401:
     *         description: Invalid credentials or inactive account
     *       500:
     *         description: Internal server error
     */
    this.router.post('/login', validationMiddleware(LoginUserDto), this.login.bind(this));
    
    /**
     * @swagger
     * /auth/google/url:
     *   get:
     *     tags: [Authentication]
     *     summary: Get Google OAuth URL
     *     description: Get the URL to redirect the user to Google for authentication
     *     responses:
     *       200:
     *         description: Google OAuth URL
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 url:
     *                   type: string
     */
    this.router.get('/google/url', this.getGoogleAuthUrl.bind(this));
    
    /**
     * @swagger
     * /auth/google/callback:
     *   get:
     *     tags: [Authentication]
     *     summary: Google OAuth callback
     *     description: Handle the Google OAuth callback after user authentication
     *     parameters:
     *       - in: query
     *         name: code
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       302:
     *         description: Redirect to frontend with tokens
     */
    this.router.get('/google/callback', this.handleGoogleCallback.bind(this));
    
    /**
     * @swagger
     * /auth/google:
     *   post:
     *     tags: [Authentication]
     *     summary: Authenticate with Google ID token
     *     description: Authenticate user with Google ID token from client-side authentication
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/GoogleAuthDto'
     *     responses:
     *       200:
     *         description: Authentication successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TokenDto'
     *       401:
     *         description: Invalid Google token
     *       500:
     *         description: Internal server error
     */
    this.router.post('/google', validationMiddleware(GoogleAuthDto), this.authenticateWithGoogle.bind(this));
    
    /**
     * @swagger
     * /auth/refresh-token:
     *   post:
     *     tags: [Authentication]
     *     summary: Refresh access token
     *     description: Get a new access token using a valid refresh token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RefreshTokenDto'
     *     responses:
     *       200:
     *         description: Token refreshed successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TokenDto'
     *       401:
     *         description: Invalid refresh token
     *       500:
     *         description: Internal server error
     */
    this.router.post('/refresh-token', validationMiddleware(RefreshTokenDto), this.refreshToken.bind(this));
    
    /**
     * @swagger
     * /auth/forgot-password:
     *   post:
     *     tags: [Authentication]
     *     summary: Request password reset
     *     description: Send a password reset link to the user's email
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ForgotPasswordDto'
     *     responses:
     *       200:
     *         description: Reset link sent if email exists
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       500:
     *         description: Internal server error
     */
    this.router.post('/forgot-password', validationMiddleware(ForgotPasswordDto), this.forgotPassword.bind(this));
    
    /**
     * @swagger
     * /auth/reset-password:
     *   post:
     *     tags: [Authentication]
     *     summary: Reset password
     *     description: Reset user password using a valid reset token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ResetPasswordDto'
     *     responses:
     *       200:
     *         description: Password reset successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid or expired reset token
     *       500:
     *         description: Internal server error
     */
    this.router.post('/reset-password', validationMiddleware(ResetPasswordDto), this.resetPassword.bind(this));
    
    /**
     * @swagger
     * /auth/logout:
     *   post:
     *     tags: [Authentication]
     *     summary: Logout user
     *     description: Logout the currently authenticated user
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Logout successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
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
  
  private async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      console.log('Received forgot password request:', { email: req.body.email });
      
      const forgotPasswordDto: ForgotPasswordDto = req.body;
      
      // Process the request (will not reveal if email exists)
      await this.authService.forgotPassword(forgotPasswordDto);
      
      // Always return the same response to prevent email enumeration
      res.status(200).json({
        message: 'If your email is registered, you will receive a reset link'
      });
      
      console.log('Forgot password request processed successfully');
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  private async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const resetPasswordDto: ResetPasswordDto = req.body;
      
      await this.authService.resetPassword(resetPasswordDto);
      
      res.status(200).json({
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'Invalid or expired reset token' || 
           error.message === 'Reset token has expired')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
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

  private async getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const url = this.googleAuthService.getAuthUrl();
      res.status(200).json({ url });
    } catch (error) {
      console.error('Google auth URL error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  private async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      // Check for any error in query parameters
      if (req.query.error) {
        console.error('Google auth error:', req.query.error);
        res.redirect(`${config.frontendUrl}/login-error`);
        return;
      }
      
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        console.error('Missing authorization code');
        res.redirect(`${config.frontendUrl}/login-error`);
        return;
      }
      
      // Process the OAuth callback with Google
      const user = await this.googleAuthService.handleCallback(code);
      
      // Generate tokens for the authenticated user
      const tokens = await this.authService.generateTokensForUser(user);
      
      // Redirect to frontend with tokens as query parameters
      // In a production app, you might want to use a more secure method
      const redirectUrl = `${config.frontendUrl}/login-success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&firstLogin=${tokens.firstLogin}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${config.frontendUrl}/login-error`);
    }
  }

  private async authenticateWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body as GoogleAuthDto;
      
      // Verify the Google ID token and get/create the user
      const user = await this.googleAuthService.verifyGoogleIdToken(idToken);
      
      // Generate tokens for the authenticated user
      const tokens = await this.authService.generateTokensForUser(user);
      
      res.status(200).json(tokens);
    } catch (error) {
      console.error('Google authentication error:', error);
      res.status(401).json({ message: 'Invalid Google token' });
    }
  }
} 