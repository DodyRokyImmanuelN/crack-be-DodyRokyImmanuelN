import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateModuleDto {

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the learning path this module belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  learningPathId!: string;

  @ApiProperty({
    example: 'Introduction to JavaScript',
    description: 'Title of the module',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'An overview of JavaScript fundamentals',
    description: 'Description of the module',
  })
  @IsString()
  @IsOptional()
  description?: string;
  

  @ApiProperty({
    example: 1,
    description: 'Order of the module within the learning path',
  })
  @IsNumber()
  @Min(1)
  order!: number;
}