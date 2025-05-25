import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '../models/user.entity';
import { MemberProfile } from '../models/member-profile.entity';
import { RegisterUserDto, LoginUserDto, TokenDto, ForgotPasswordDto, ResetPasswordDto } from '../dtos/auth.dto';
import { UserRepository } from '../repositories/user.repository';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { EmailService } from './email.service';
import config from '../config/config';

export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // In-memory storage (use Redis in production)

  constructor(
    private userRepository: UserRepository,
    private memberProfileRepository: MemberProfileRepository,
    private emailService: EmailService
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    // Check if user with the same email already exists
    const existingUser = await this.userRepository.findByEmail(registerUserDto.email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    // Generate confirmation token and expiry
    const emailConfirmationToken = crypto.randomBytes(32).toString('hex');
    const emailConfirmationExpires = new Date();
    emailConfirmationExpires.setHours(emailConfirmationExpires.getHours() + 24); // 24 hours expiry

    // Create and save the new user (inactive, not confirmed)
    const user = await this.userRepository.create({
      ...registerUserDto,
      password: hashedPassword,
      role: UserRole.MEMBER,
      registrationDate: new Date(),
      active: false,
      emailConfirmed: false,
      emailConfirmationToken,
      emailConfirmationExpires
    });

    // Send confirmation email
    await this.emailService.sendEmailConfirmationEmail(user.email, user.name, emailConfirmationToken);

    return user;
  }

  async login(loginUserDto: LoginUserDto): Promise<TokenDto> {
    // Find the user
    const user = await this.userRepository.findByEmail(loginUserDto.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (!user.active) {
      // If user is not active and not confirmed, check if confirmation expired
      if (!user.emailConfirmed) {
        const now = new Date();
        if (!user.emailConfirmationToken || !user.emailConfirmationExpires || now > user.emailConfirmationExpires) {
          // Generate new token and expiry
          const newToken = crypto.randomBytes(32).toString('hex');
          const newExpires = new Date();
          newExpires.setHours(newExpires.getHours() + 24);
          user.emailConfirmationToken = newToken;
          user.emailConfirmationExpires = newExpires;
          await this.userRepository.updateUser(user);
          await this.emailService.sendEmailConfirmationEmail(user.email, user.name, newToken);
          throw new Error('Email de confirmação expirado. Um novo e-mail foi enviado. Por favor, verifique sua caixa de entrada.');
        } else {
          throw new Error('Sua conta ainda não foi ativada. Por favor, confirme seu e-mail para acessar a plataforma.');
        }
      }
      throw new Error('User account is inactive');
    }

    // Get member profile for name
    const profile = await this.memberProfileRepository.findByUserId(user.id);
    const displayName = profile?.nickName || user.name;
    // Generate tokens with name
    const tokens = this.generateTokens(user, displayName);

    if (!profile) {
      // First login - set the flag
      tokens.firstLogin = true;
    } else {
      // Not first login - update last login timestamp
      await this.memberProfileRepository.updateLastLogin(user.id);
    }

    // Store refresh token
    this.refreshTokens.set(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshToken(userId: string, refreshToken: string): Promise<TokenDto> {
    // Validate refresh token
    const storedRefreshToken = this.refreshTokens.get(userId);

    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Find the user
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Update stored refresh token
    this.refreshTokens.set(user.id, tokens.refreshToken);

    return tokens;
  }

  logout(userId: string): void {
    // Remove refresh token
    this.refreshTokens.delete(userId);
  }
  
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;
    
    // Find the user
    const user = await this.userRepository.findByEmail(email);
    
    // If user not found, just return without error to prevent email enumeration
    if (!user) {
      return;
    }
    
    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (60 minutes from now)
    const resetTokenExpiration = new Date();
    resetTokenExpiration.setMinutes(resetTokenExpiration.getMinutes() + 60);
    
    // Save the token and expiration to the user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiration;
    
    await this.userRepository.updateUser(user);
    
    // Send the reset password email
    await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
  }
  
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;
    
    // Find user with the token
    const user = await this.userRepository.findByResetPasswordToken(token);
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }
    
    // Check if token is expired
    const now = new Date();
    if (!user.resetPasswordExpires || now > user.resetPasswordExpires) {
      throw new Error('Reset token has expired');
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await this.userRepository.updateUser(user);
  }

  /**
   * Generate JWT tokens for a user (used for both regular and Google OAuth login)
   * @param user The user to generate tokens for
   * @returns Access and refresh tokens
   */
  async generateTokensForUser(user: User): Promise<TokenDto> {
    // Get member profile for name
    const profile = await this.memberProfileRepository.findByUserId(user.id);
    const displayName = profile?.nickName || user.name;
    const tokens = this.generateTokens(user, displayName);
    if (!profile) {
      tokens.firstLogin = true;
    } else {
      await this.memberProfileRepository.updateLastLogin(user.id);
    }
    this.refreshTokens.set(user.id, tokens.refreshToken);
    return tokens;
  }

  private generateTokens(user: User, name?: string): TokenDto {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: name || user.name
    };

    // Use any type to work around typescript issues
    const jwtSign: any = jwt.sign;
    
    const accessToken = jwtSign(
      payload, 
      config.jwt.secret, 
      { expiresIn: config.jwt.accessTokenExpiry }
    );

    const refreshToken = jwtSign(
      { id: user.id }, 
      config.jwt.secret, 
      { expiresIn: config.jwt.refreshTokenExpiry }
    );

    // Create and return a TokenDto instance instead of a plain object
    const tokenDto = new TokenDto();
    tokenDto.accessToken = accessToken;
    tokenDto.refreshToken = refreshToken;
    
    return tokenDto;
  }

  async confirmEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByEmailConfirmationToken(token);
    if (!user) {
      throw new Error('Invalid or expired confirmation token');
    }
    const now = new Date();
    if (!user.emailConfirmationExpires || now > user.emailConfirmationExpires) {
      throw new Error('Confirmation token has expired');
    }
    user.emailConfirmed = true;
    user.active = true;
    user.emailConfirmationToken = undefined;
    user.emailConfirmationExpires = undefined;
    await this.userRepository.updateUser(user);
  }
} 