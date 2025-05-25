import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto, ConfirmEmailDto } from '../dtos/auth.dto';
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

    /**
     * @swagger
     * /auth/me:
     *   get:
     *     tags: [Authentication]
     *     summary: Get current authenticated user
     *     description: Returns the authenticated user's information
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Authenticated user info
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                 name:
     *                   type: string
     *                 email:
     *                   type: string
     *                 role:
     *                   type: string
     *       401:
     *         description: Unauthorized
     */
    this.router.get('/me', authMiddleware, this.me.bind(this));

    /**
     * @swagger
     * /auth/confirm-email:
     *   post:
     *     tags: [Authentication]
     *     summary: Confirm user email
     *     description: Confirms a user's email address using a confirmation token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ConfirmEmailDto'
     *     responses:
     *       200:
     *         description: Email confirmed successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid or expired confirmation token
     *       500:
     *         description: Internal server error
     */
    this.router.post('/confirm-email', validationMiddleware(ConfirmEmailDto), this.confirmEmail.bind(this));

    /**
     * @swagger
     * /auth/refresh-token:
     *   post:
     *     tags: [Authentication]
     *     summary: Refresh access token
     *     description: Refresh the access token using a valid refresh token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: Valid refresh token
     *     responses:
     *       200:
     *         description: New tokens issued
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 accessToken:
     *                   type: string
     *                 refreshToken:
     *                   type: string
     *       401:
     *         description: Invalid or expired refresh token
     *       500:
     *         description: Internal server error
     */
    this.router.post('/refresh-token', this.refreshToken.bind(this));
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
      // Set cookies for accessToken and refreshToken
      const cookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 15 // 15 minutes (should match accessToken expiry)
      };
      const refreshCookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days (should match refreshToken expiry)
      };
      // Only set domain in production
      if (process.env.NODE_ENV === 'production') {
        cookieOptions['domain'] = config.cookie.domain;
        refreshCookieOptions['domain'] = config.cookie.domain;
      }
      res.cookie('accessToken', tokens.accessToken, cookieOptions);
      res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
      // Return only firstLogin indicator
      res.status(200).json({ firstLogin: !!tokens.firstLogin });
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'Invalid email or password' || 
           error.message === 'User account is inactive' ||
           error.message === 'Email de confirmação expirado. Um novo e-mail foi enviado. Por favor, verifique sua caixa de entrada.' ||
           error.message === 'Sua conta ainda não foi ativada. Por favor, confirme seu e-mail para acessar a plataforma.')) {
        res.status(401).json({ message: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
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

      // Clear cookies for accessToken and refreshToken
      const cookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
      };
      if (process.env.NODE_ENV === 'production') {
        cookieOptions['domain'] = config.cookie.domain;
      }
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

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
      const user = await this.googleAuthService.handleCallback(code);
      const tokens = await this.authService.generateTokensForUser(user);
      // Set cookies for accessToken and refreshToken
      const cookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 15 // 15 minutes
      };
      const refreshCookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      };
      if (process.env.NODE_ENV === 'production') {
        cookieOptions['domain'] = config.cookie.domain;
        refreshCookieOptions['domain'] = config.cookie.domain;
      }
      res.cookie('accessToken', tokens.accessToken, cookieOptions);
      res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
      // Redirect to frontend with only firstLogin indicator
      const redirectUrl = `${config.frontendUrl}/login-success?firstLogin=${tokens.firstLogin ? 'true' : 'false'}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${config.frontendUrl}/login-error`);
    }
  }

  private async authenticateWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body as GoogleAuthDto;
      const user = await this.googleAuthService.verifyGoogleIdToken(idToken);
      const tokens = await this.authService.generateTokensForUser(user);
      // Set cookies for accessToken and refreshToken
      const cookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 15 // 15 minutes
      };
      const refreshCookieOptions = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      };
      if (process.env.NODE_ENV === 'production') {
        cookieOptions['domain'] = config.cookie.domain;
        refreshCookieOptions['domain'] = config.cookie.domain;
      }
      res.cookie('accessToken', tokens.accessToken, cookieOptions);
      res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
      // Return only firstLogin indicator
      res.status(200).json({ firstLogin: !!tokens.firstLogin });
    } catch (error) {
      console.error('Google authentication error:', error);
      res.status(401).json({ message: 'Invalid Google token' });
    }
  }

  private async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      // Optionally, fetch full user info from DB if needed
      res.status(200).json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  private async confirmEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      await this.authService.confirmEmail(token);
      res.status(200).json({ message: 'Email confirmado com sucesso!' });
    } catch (error) {
      if (error instanceof Error && (error.message === 'Invalid or expired confirmation token' || error.message === 'Confirmation token has expired')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Email confirmation error:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(401).json({ message: 'Refresh token não fornecido.' });
        return;
      }
      // Decodifica o refresh token para obter o userId
      const jwt = require('jsonwebtoken');
      let payload;
      try {
        payload = jwt.verify(refreshToken, config.jwt.secret);
      } catch (err) {
        res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
        return;
      }
      const userId = payload.id;
      const tokens = await this.authService.refreshToken(userId, refreshToken);
      res.status(200).json(tokens);
    } catch (error) {
      res.status(401).json({ message: 'Não foi possível renovar o token.' });
    }
  }
} 