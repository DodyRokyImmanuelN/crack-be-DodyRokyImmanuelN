import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';
import { LessonType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLessonDto {

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the module this lesson belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  moduleId!: string;

  @ApiProperty({
    example: 'What is JavaScript?',
    description: 'Title of the lesson',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'video',
    description: 'Type of the lesson',
  })
  @IsEnum(LessonType)
  type!: LessonType;

  @ApiProperty({
    example: 1,
    description: 'Order of the lesson within the module',
  })
  @IsNumber()
  @Min(1)
  order!: number;

  // Untuk Bacaan — opsional
  @ApiProperty({
    example: 'JavaScript is a programming language...',
    description: 'Content of the lesson',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'URL of the lesson video',
  })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}