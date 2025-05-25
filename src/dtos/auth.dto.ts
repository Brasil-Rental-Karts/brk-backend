import { IsEmail, IsString, MinLength, IsNotEmpty, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterUserDto:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password
 *         phone:
 *           type: string
 *           description: User's phone number (optional)
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
 * @swagger
 * components:
 *   schemas:
 *     LoginUserDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
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
 * @swagger
 * components:
 *   schemas:
 *     TokenDto:
 *       type: object
 *       required:
 *         - accessToken
 *         - refreshToken
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *         firstLogin:
 *           type: boolean
 *           description: Flag indicating if this is the user's first login
 */
export class TokenDto extends BaseDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
  
  @IsBoolean()
  firstLogin: boolean = false;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RefreshTokenDto:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Valid refresh token
 */
export class RefreshTokenDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ForgotPasswordDto:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 */
export class ForgotPasswordDto extends BaseDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ResetPasswordDto:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Password reset token
 *         password:
 *           type: string
 *           minLength: 6
 *           description: New password
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

/**
 * @swagger
 * components:
 *   schemas:
 *     GoogleAuthDto:
 *       type: object
 *       required:
 *         - idToken
 *       properties:
 *         idToken:
 *           type: string
 *           description: Google ID Token from client-side authentication
 */
export class GoogleAuthDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Google ID token is required' })
  idToken!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ConfirmEmailDto:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Email confirmation token
 */
export class ConfirmEmailDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;
} 