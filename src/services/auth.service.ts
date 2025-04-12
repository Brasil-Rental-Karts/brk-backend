import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/user.entity';
import { RegisterUserDto, LoginUserDto, TokenDto } from '../dtos/auth.dto';
import config from '../config/config';

export class AuthService {
  private userRepository: Repository<User>;
  private refreshTokens: Map<string, string> = new Map(); // In-memory storage (use Redis in production)

  constructor(userRepository: Repository<User>) {
    this.userRepository = userRepository;
  }

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    // Check if user with the same email already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: registerUserDto.email } 
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    // Create and save the new user
    const user = this.userRepository.create({
      ...registerUserDto,
      password: hashedPassword,
      role: UserRole.MEMBER,
      registrationDate: new Date()
    });

    return this.userRepository.save(user);
  }

  async login(loginUserDto: LoginUserDto): Promise<TokenDto> {
    // Find the user
    const user = await this.userRepository.findOne({ 
      where: { email: loginUserDto.email } 
    });

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
    const user = await this.userRepository.findOne({ where: { id: userId } });

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

    return {
      accessToken,
      refreshToken
    };
  }
} 