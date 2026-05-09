import { ApiProperty } from '@nestjs/swagger';
import {IsEmail, IsNotEmpty, IsString, MinLength} from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({
        example: 'user@gmail.com',
        description: 'User email address',
    })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({
        example: 'password123',
        description: 'User password',
    })
    @IsString()
    @MinLength(6)
    password!: string;
}