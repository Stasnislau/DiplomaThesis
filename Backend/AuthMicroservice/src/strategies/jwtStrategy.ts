import { ExtractJwt, Strategy } from "passport-jwt";

import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

/** JWT Token payload structure */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/** Validated user returned from JWT strategy */
interface ValidatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("jwt.secret"),
      algorithms: ["HS256"],
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
