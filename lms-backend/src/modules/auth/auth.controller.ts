import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response,Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor( private authService: AuthService) {}
    

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.authService.register(dto);
        return{
            success: true,
            message: 'User registered successfully',
            data: user,
        };
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);

        //simpan refresh token di cookie
        res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        });
      return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };  
    }
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(
      @CurrentUser() user: { id: string },
      @Res({ passthrough: true }) res: Response,
    ) {
      await this.authService.logout(user.id);
      res.clearCookie('refreshToken');

      return {
        success: true,
        message: 'Logout was successful',
      };
    }
    @Post('refresh')
async refresh(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token not found');
  }

  // Decode token untuk ambil userId
  const decoded = this.authService.decodeToken(refreshToken);
  const result = await this.authService.refreshToken(
    decoded.sub,
    refreshToken,
  );

  // Set cookie baru
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return {
    success: true,
    message: 'Token berhasil diperbarui',
    data: {
      accessToken: result.accessToken,
    },
  };
}
 
}
