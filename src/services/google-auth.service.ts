import { OAuth2Client } from 'google-auth-library';
import { User, UserRole } from '../models/user.entity';
import { MemberProfile } from '../models/member-profile.entity';
import { UserRepository } from '../repositories/user.repository';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import config from '../config/config';
import crypto from 'crypto';

export class GoogleAuthService {
  private oAuth2Client: OAuth2Client;

  constructor(
    private userRepository: UserRepository,
    private memberProfileRepository: MemberProfileRepository
  ) {
    this.oAuth2Client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  /**
   * Generate the Google OAuth URL for the user to authenticate
   */
  getAuthUrl(): string {
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });
  }

  /**
   * Handle the Google OAuth callback and user creation/authentication
   */
  async handleCallback(code: string): Promise<User> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);

      // Get user info using the access token
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: config.google.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Failed to get user info from Google');
      }

      // Extract user data from payload
      const {
        sub: googleId,
        email,
        name,
        picture: profilePicture
      } = payload;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user already exists with this email
      let user = await this.userRepository.findByEmail(email);

      if (user) {
        // Update existing user's Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          user.profilePicture = profilePicture;
          user = await this.userRepository.updateUser(user);
        }
      } else {
        // Create new user
        const randomPassword = crypto.randomBytes(16).toString('hex');
        user = await this.userRepository.create({
          name: name || 'Google User',
          email,
          password: randomPassword, // Random password as we won't use it for Google auth
          googleId,
          profilePicture,
          role: UserRole.MEMBER,
          registrationDate: new Date(),
          active: true
        });
      }

      return user;
    } catch (error) {
      console.error('Google auth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Verify Google ID token (for mobile/client-side applications)
   */
  async verifyGoogleIdToken(idToken: string): Promise<User> {
    try {
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken,
        audience: config.google.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Failed to get user info from Google');
      }

      const {
        sub: googleId,
        email,
        name,
        picture: profilePicture
      } = payload;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user already exists with this email
      let user = await this.userRepository.findByEmail(email);

      if (user) {
        // Update existing user's Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          user.profilePicture = profilePicture;
          user = await this.userRepository.updateUser(user);
        }
      } else {
        // Create new user
        const randomPassword = crypto.randomBytes(16).toString('hex');
        user = await this.userRepository.create({
          name: name || 'Google User',
          email,
          password: randomPassword, // Random password as we won't use it for Google auth
          googleId,
          profilePicture,
          role: UserRole.MEMBER,
          registrationDate: new Date(),
          active: true
        });
      }

      return user;
    } catch (error) {
      console.error('Google token verification error:', error);
      throw new Error('Failed to verify Google ID token');
    }
  }
} 