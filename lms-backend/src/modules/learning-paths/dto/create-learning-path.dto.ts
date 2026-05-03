import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateLearningPathDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}