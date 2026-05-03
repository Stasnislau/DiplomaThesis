import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthService } from '../services/authService';
import { AUTH_INVALID_CREDENTIALS, throwWithCode } from '../utils/errorCodes';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throwWithCode(
        AUTH_INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
        "Invalid email or password",
      );
    }
    return user;
  }
}
