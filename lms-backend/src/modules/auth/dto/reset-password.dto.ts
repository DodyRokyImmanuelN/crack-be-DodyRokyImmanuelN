import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'token_dari_email' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'password_baru_123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}