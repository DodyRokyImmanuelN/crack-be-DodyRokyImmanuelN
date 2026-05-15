import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLearningPathDto {
  @ApiProperty({
    example: 'Full Stack Web Development',
    description: 'Title of the learning path',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'A comprehensive guide to full stack web development',
    description: 'Description of the learning path',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: 'https://example.com/thumbnail.jpg',
    description: 'URL of the learning path thumbnail',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    example: 99.99,
    description: 'Price of the learning path (must be >= 0)',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number with max 2 decimal places' },
  )
  @Min(0, { message: 'Price must not be less than 0' })
  price!: number;

  @ApiProperty({
    example: true,
    description: 'Whether the learning path is published',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}