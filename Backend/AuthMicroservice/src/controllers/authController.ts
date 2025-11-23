import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Put,
} from "@nestjs/common";
import { AuthService } from "../services/authService";
import { JwtAuthGuard } from "../guards/jwtAuthGuard";
import { LoginDto } from "src/dtos/loginDto";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { RolesGuard } from "../guards/rolesGuard";
import { Roles } from "../guards/roles.decorator";
import { UserDto } from "src/dtos/userDto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authService.login(loginDto);
    return {
      success: true,
      payload: response,
    };
  }

  @Post("refresh")
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    const response = await this.authService.refreshToken(refreshToken);
    return {
      success: true,
      payload: response,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Body("refreshToken") refreshToken: string) {
    await this.authService.removeRefreshToken(refreshToken);
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
  @Roles("admin")
  @Get("allUsers")
  async getAllUsers() {
    const response = await this.authService.getAllUsers();
    return {
      success: true,
      payload: response,
    };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CHECK_USER_IN_SERVICE", "ADMIN")
  @Put("updatePassword")
  async updatePassword(
    @Request() req: AuthenticatedRequest,
    @Body() password: { oldPassword: string; newPassword: string }
  ) {
    await this.authService.updatePassword(
      req.user.id,
      password.oldPassword,
      password.newPassword
      
    );
    return { success: true, payload: "Password updated successfully" };
  }
}
