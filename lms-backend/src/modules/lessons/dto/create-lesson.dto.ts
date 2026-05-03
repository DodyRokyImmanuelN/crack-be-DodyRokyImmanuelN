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

export class CreateLessonDto {
  @IsUUID()
  @IsNotEmpty()
  moduleId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsNumber()
  @Min(1)
  order!: number;

  // Untuk Bacaan — opsional
  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}