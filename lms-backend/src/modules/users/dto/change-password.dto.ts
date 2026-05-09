import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {

  @ApiProperty({ example: 'password_lama' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'password_baru_123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}