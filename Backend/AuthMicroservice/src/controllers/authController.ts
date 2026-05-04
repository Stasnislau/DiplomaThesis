import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Req,
  Res,
} from "@nestjs/common";
import { Request as ExpressRequest, Response } from "express";
import { AuthService } from "../services/authService";
import { JwtAuthGuard } from "../guards/jwtAuthGuard";
import { LoginDto } from "../dtos/loginDto";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { RolesGuard } from "../guards/rolesGuard";
import { Roles } from "../guards/roles.decorator";
import { UserDto } from "../dtos/userDto";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  // Production sits behind Caddy with HTTPS, so Secure can be hard-on.
  // Locally (NODE_ENV !== "production") we fall back to non-Secure so
  // the cookie still gets set on http://localhost.
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

type CookieRequest = ExpressRequest;

/** Device fingerprint = SHA-256(User-Agent ‖ origin IP). Gateway puts
 *  the real client IP into X-Forwarded-For — falling back to req.ip
 *  is fine on direct hits (rare in prod). */
function fingerprintFor(req: ExpressRequest): string {
  const ua = (req.headers["user-agent"] as string) ?? "";
  const xff = (req.headers["x-forwarded-for"] as string) ?? "";
  const ip = xff ? xff.split(",")[0].trim() : (req.ip ?? "");
  return AuthService.deviceFingerprint(ua, ip);
}

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      loginDto,
      fingerprintFor(req),
    );
    // Refresh token never crosses the JS boundary on the frontend —
    // it lives in an httpOnly cookie so XSS cannot read it. The body
    // payload now carries only the short-lived access token.
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return {
      success: true,
      payload: { accessToken },
    };
  }

  @Post("refresh")
  async refreshToken(
    @Req() req: CookieRequest,
    @Body("refreshToken") bodyRefreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prefer the cookie. Fall back to the body for clients that
    // haven't migrated yet (so a partial deploy doesn't break logins).
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? bodyRefreshToken;
    const response = await this.authService.refreshToken(
      refreshToken,
      fingerprintFor(req),
    );
    if (response.refreshToken) {
      res.cookie(REFRESH_COOKIE, response.refreshToken, refreshCookieOptions());
    }
    return {
      success: true,
      payload: { accessToken: response.accessToken },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(
    @Req() req: CookieRequest,
    @Body("refreshToken") bodyRefreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? bodyRefreshToken;
    if (refreshToken) {
      try {
        await this.authService.removeRefreshToken(refreshToken);
      } catch {
        // Token already gone is fine; we still want to clear the cookie.
      }
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return {
      success: true,
      payload: "Logged out successfully",
    };
  }

  @Post("register")
  async register(@Body() user: UserDto) {
    const response = await this.authService.register(user);
    return {
      success: true,
      payload: response,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("resetPassword")
  async resetPassword(@Body("email") email: string) {
    await this.authService.resetPassword(email);
    return {
      success: true,
      payload: "Password has been reset",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("validate")
  async validateToken(@Request() req: AuthenticatedRequest) {
    return {
      success: true,
      payload: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get("allUsers")
  async getAllUsers() {
    const response = await this.authService.getAllUsers();
    return {
      success: true,
      payload: response,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Put("updatePassword")
  async updatePassword(
    @Request() req: AuthenticatedRequest,
    @Body() password: { oldPassword: string; newPassword: string },
  ) {
    await this.authService.updatePassword(
      req.user.id,
      password.oldPassword,
      password.newPassword,
    );
    return { success: true, payload: "Password updated successfully" };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch("updateRole")
  async updateRole(
    @Body() body: { id: string; role: string },
  ) {
    await this.authService.updateUserRole({ id: body.id, role: body.role as any });
    return { success: true, payload: "User role updated successfully" };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete("deleteUser/:id")
  async deleteUser(@Param("id") id: string) {
    await this.authService.deleteUser({ id });
    return { success: true, payload: "User deleted successfully" };
  }
}
