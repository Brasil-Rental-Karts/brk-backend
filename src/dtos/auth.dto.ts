import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { BaseDto } from './base.dto';

/**
 * Data Transfer Object for user registration
 */
export class RegisterUserDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsString()
  phone?: string;
}

/**
 * Data Transfer Object for user login
 */
export class LoginUserDto extends BaseDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

/**
 * Data Transfer Object for token response
 */
export class TokenDto extends BaseDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * Data Transfer Object for token refresh
 */
export class RefreshTokenDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

/**
 * Data Transfer Object for password reset request
 */
export class ForgotPasswordDto extends BaseDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;
}

/**
 * Data Transfer Object for password reset confirmation
 */
export class ResetPasswordDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
} 