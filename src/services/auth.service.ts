import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '../models/user.entity';
import { RegisterUserDto, LoginUserDto, TokenDto, ForgotPasswordDto, ResetPasswordDto } from '../dtos/auth.dto';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from './email.service';
import config from '../config/config';

export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // In-memory storage (use Redis in production)

  constructor(
    private userRepository: UserRepository,
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

    // Create and save the new user
    return this.userRepository.create({
      ...registerUserDto,
      password: hashedPassword,
      role: UserRole.MEMBER,
      registrationDate: new Date()
    });
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
      throw new Error('User account is inactive');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

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

  private generateTokens(user: User): TokenDto {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
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
} 