import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UnauthorizedException } from "src/exceptions/customException";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log("Headers:", request.headers);
    console.log("Authorization header:", request.headers.authorization);
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log("JWT auth error:", err);
    console.log("User:", user);
    console.log("Info:", info);
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
