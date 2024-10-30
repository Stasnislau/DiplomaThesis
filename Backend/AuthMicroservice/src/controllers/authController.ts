import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "../services/authService";
import { LocalAuthGuard } from "../guards/localAuthGuard";
import { JwtAuthGuard } from "../guards/jwtAuthGuard";
import { UserDto } from "src/dtos/userDto";
import { LoginDto } from "src/dtos/loginDto";

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
}
