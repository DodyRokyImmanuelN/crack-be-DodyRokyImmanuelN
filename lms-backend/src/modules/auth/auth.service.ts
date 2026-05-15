import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,

} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    // Cek apakah email sudah terdaftar
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Simpan user baru
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    // Cari user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    // Cek password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Simpan refresh token ke database (di-hash dulu)
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    // Hapus refresh token dari database
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logout was successful' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '7d',
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }
  async refreshToken(userId: string, refreshToken: string) {
  // Cari user
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.refreshToken) {
    throw new UnauthorizedException('Access denied');
  }

  // Bandingkan refresh token dengan yang di database
  const isRefreshTokenValid = await bcrypt.compare(
    refreshToken,
    user.refreshToken,
  );

  if (!isRefreshTokenValid) {
    throw new UnauthorizedException('Refresh token is invalid');
  }

  // Generate access token baru
  const tokens = await this.generateTokens(user.id, user.email, user.role);

  // Update refresh token di database
  const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
  await this.prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  return tokens;
  }
    decodeToken(token: string) {
      return this.jwtService.decode(token) as { sub: string };
  }
    
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: {email}});
    // generic response untuk mencegah enumeration attack
    if(!user) {
      this.logger.warn(`Forgot password attempt for unregistered email: ${email}` );
      return { message : 'We have sent a reset password link to your email address.' };
    }
    //generate token plain (dikirim via email)
    const plainToken = crypto.randomBytes(32).toString('hex');
    // hash token sebelum di simpan di database 
    const hashedToken = await bcrypt.hash(plainToken, 10 );
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 menit


    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });

    //kirim plain token via email

    await this.mailService.sendResetPasswordEmail(user.email, plainToken);
    this.logger.log(`Reset password token generated and email sent to: ${email}`);
    return { message: `We have sent a reset password link to your email address`};
  }
  // verify token 
  async verifyResetToken( token: string) {
    const users = await this.prisma.user.findMany({
      where: {
        passwordResetToken: {not: null},
        passwordResetExpiry: {gt: new Date()},
      },
    });

    // cari user dengan token yang cocok
    for (const user of users) {
      const isMatch = await bcrypt.compare( token, user.passwordResetToken!);
      if (isMatch) {
        return { valid: true, message: 'Reset token is valid' };
      }
    }
    throw new BadRequestException('Reset token is invalid or has expired');
  }

  // reset password

  async resetPassword(token: string, newPassword: string){
    // cari semua user dengan token yang masih valid
    const users = await this.prisma.user.findMany({
      where: {
        passwordResetToken: {not: null},
        passwordResetExpiry: {gt: new Date()},
       },
    });

    // cari user dengan token yang cocok 
    let matchedUser: Awaited<ReturnType<typeof this.prisma.user.findFirst>> = null;
    for (const user of users) {
      const isMatch = await bcrypt.compare(token, user.passwordResetToken!);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }
    if (!matchedUser) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    //hash password baru dan clear token 

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: matchedUser.id},
      data : {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    this.logger.log(`Password reset successful for user: ${matchedUser.email}`);
    return { message: ' Password has been reset successfully'};
  }
  

}