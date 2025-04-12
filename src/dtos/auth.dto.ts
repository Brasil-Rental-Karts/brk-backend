export class RegisterUserDto {
  name!: string;
  email!: string;
  password!: string;
  phone?: string;
}

export class LoginUserDto {
  email!: string;
  password!: string;
}

export class TokenDto {
  accessToken!: string;
  refreshToken!: string;
}

export class RefreshTokenDto {
  refreshToken!: string;
} 