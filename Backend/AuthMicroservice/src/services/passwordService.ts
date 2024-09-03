import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { AuthService } from './authService';
import { User } from '@prisma/client';

export class PassportService {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();

    passport.use(
      new LocalStrategy(
        {
          usernameField: 'email',
        },
        async (email, password, done) => {
          try {
            if (!email || !password) {
              return done(null, false, { message: 'Email and password are required' });
            }
            const user = await this.authService.findUserByEmail(email);

            if (!user) {
              return done(null, false, { message: 'User not found' });
            }

            const isPasswordValid = await this.authService.validatePassword(
              user,
              password
            );

            if (!isPasswordValid) {
              return done(null, false, { message: 'Incorrect password' });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );

    passport.serializeUser((user: User, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.authService.findUserById(id);
        done(null, user || null);
      } catch (err) {
        done(err, null);
      }
    });
  }

  initialize() {
    return passport.initialize();
  }

  session() {
    return passport.session();
  }
}

export const passportService = new PassportService();
